import { lookup } from 'dns/promises';
import { isIP } from 'net';
import type { BrowserContext, Page, Request, Route } from 'playwright';
import { UnrecoverableError } from 'bullmq';
import { canonicalHost, isAllowedTargetUrl, isInternalHost, isPrivateIpv4, isPrivateIpv6 } from './url-policy';

/**
 * Thrown when the page tried to leave the allow-list (e.g. via a LinkedIn
 * open redirect). Extends BullMQ's UnrecoverableError so the job is not
 * retried — the same URL would be blocked again.
 */
export class NavigationBlockedError extends UnrecoverableError {
  constructor(readonly blockedUrl: string) {
    super(`Navigation blocked by URL policy: ${blockedUrl}`);
    this.name = 'NavigationBlockedError';
  }
}

export interface NavigationGuard {
  /** First URL that was blocked for this page, if any. */
  blockedUrl(): string | null;
  /** Throws NavigationBlockedError if anything was blocked for this page. */
  assertNotBlocked(): void;
}

export type HostResolver = (host: string) => Promise<string[]>;

const defaultResolver: HostResolver = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

const DNS_CACHE_TTL_MS = 60_000;

interface ContextGuardState {
  blockedByPage: WeakMap<Page, string>;
}

const installedContexts = new WeakMap<BrowserContext, ContextGuardState>();

function isPrivateAddress(address: string): boolean {
  return isPrivateIpv4(address) || isPrivateIpv6(address);
}

/**
 * Resolves the host and rejects it if ANY address is internal — stops
 * public names that point inward (`127.0.0.1.nip.io`, DNS rebinding).
 * Unresolvable hosts are treated as internal (fail closed).
 */
function makeInternalChecker(resolve: HostResolver): (host: string) => Promise<boolean> {
  const cache = new Map<string, { internal: boolean; expires: number }>();
  return async (rawHost) => {
    const host = canonicalHost(rawHost.replace(/^\[|\]$/g, ''));
    if (isInternalHost(host)) return true;
    if (isIP(host)) return false;

    const hit = cache.get(host);
    if (hit && hit.expires > Date.now()) return hit.internal;

    let internal: boolean;
    try {
      const addresses = await resolve(host);
      internal = addresses.length === 0 || addresses.some(isPrivateAddress);
    } catch {
      internal = true;
    }
    cache.set(host, { internal, expires: Date.now() + DNS_CACHE_TTL_MS });
    return internal;
  };
}

function isTopLevel(request: Request): boolean {
  // Main frame of ANY page in the context — covers window.open popups too.
  return request.isNavigationRequest() && request.frame().parentFrame() === null;
}

async function shouldBlock(request: Request, isInternal: (host: string) => Promise<boolean>): Promise<boolean> {
  const raw = request.url();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return false;
  if (isTopLevel(request) && !isAllowedTargetUrl(raw)) return true;
  return isInternal(url.hostname);
}

function pageOf(request: Request): Page | null {
  try {
    return request.frame().page();
  } catch {
    return null; // service-worker requests have no frame (SWs are blocked anyway)
  }
}

/**
 * Installs (once per context) a request interceptor enforcing the URL policy
 * on every request — redirect hops, popups and sub-resources included. The
 * DTO only validates the submitted URL; this is the SSRF backstop.
 */
export async function installNavigationGuard(
  page: Page,
  resolve: HostResolver = defaultResolver,
): Promise<NavigationGuard> {
  const context = page.context();
  let state = installedContexts.get(context);

  if (!state) {
    const newState: ContextGuardState = { blockedByPage: new WeakMap() };
    const isInternal = makeInternalChecker(resolve);
    installedContexts.set(context, newState);

    await context.route('**/*', async (route: Route, request: Request) => {
      if (await shouldBlock(request, isInternal)) {
        const owner = pageOf(request);
        if (owner && !newState.blockedByPage.has(owner)) newState.blockedByPage.set(owner, request.url());
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });

    // A popup that got blocked still counts against the page that opened it.
    context.on('page', (popup) => {
      void popup.opener().then((opener) => {
        if (!opener) return;
        popup.on('requestfailed', () => {
          const url = newState.blockedByPage.get(popup);
          if (url && !newState.blockedByPage.has(opener)) newState.blockedByPage.set(opener, url);
        });
      });
    });
    state = newState;
  }

  const guardState = state;
  return {
    blockedUrl: () => guardState.blockedByPage.get(page) ?? null,
    assertNotBlocked: () => {
      const url = guardState.blockedByPage.get(page);
      if (url) throw new NavigationBlockedError(url);
    },
  };
}
