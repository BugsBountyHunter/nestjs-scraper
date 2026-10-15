import type { Page, Request, Route } from 'playwright';
import { UnrecoverableError } from 'bullmq';
import { isAllowedTargetUrl, isInternalUrl } from './url-policy';

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
  /** First URL that was blocked, if any. */
  blockedUrl(): string | null;
  /** Throws NavigationBlockedError if anything was blocked. */
  assertNotBlocked(): void;
}

function shouldBlock(page: Page, request: Request): boolean {
  const url = request.url();
  if (isInternalUrl(url)) return true;
  const isTopLevelNavigation = request.isNavigationRequest() && request.frame() === page.mainFrame();
  return isTopLevelNavigation && !isAllowedTargetUrl(url);
}

/**
 * Installs a request interceptor on the page. The DTO only validates the
 * submitted URL; this enforces the same policy on every redirect hop and
 * blocks sub-resources aimed at internal hosts (SSRF defence in depth).
 */
export async function installNavigationGuard(page: Page): Promise<NavigationGuard> {
  let blocked: string | null = null;

  await page.route('**/*', (route: Route, request: Request) => {
    if (shouldBlock(page, request)) {
      blocked = blocked ?? request.url();
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });

  return {
    blockedUrl: () => blocked,
    assertNotBlocked: () => {
      if (blocked) throw new NavigationBlockedError(blocked);
    },
  };
}
