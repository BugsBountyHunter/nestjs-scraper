/**
 * URL policy for everything the headless browser is allowed to touch.
 *
 * Two layers:
 *  - `isAllowedTargetUrl` — job URLs and every top-level navigation (incl.
 *    redirects) must stay on https LinkedIn on the default port.
 *  - `isInternalHost` — no request of any kind may reach loopback, private,
 *    link-local or single-label (docker service name) hosts.
 */

const LINKEDIN_HOST = /^([a-z]{2,3}\.|www\.)?linkedin\.com$/;
const INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/** Lower-case and drop trailing dots — `localhost.` and `redis.` resolve like their dot-less forms. */
export function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, '');
}

function parse(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isAllowedTargetUrl(raw: string): boolean {
  const url = parse(raw);
  if (!url) return false;
  return (
    url.protocol === 'https:' &&
    url.port === '' && // URL normalises :443 to '' — any other port is rejected
    url.username === '' &&
    url.password === '' &&
    LINKEDIN_HOST.test(url.hostname) // exact match: a trailing-dot host (`linkedin.com.`) is rejected
  );
}

export function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h.includes(':')) return false;
  if (h === '::' || h === '::1') return true;
  // Deprecated IPv4-compatible ::a.b.c.d (URL rewrites to ::7f00:1)
  if (/^::[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(h) || /^::\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  // WHATWG URL rewrites ::ffff:127.0.0.1 as ::ffff:7f00:1
  const mappedHex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const [hi, lo] = [parseInt(mappedHex[1], 16), parseInt(mappedHex[2], 16)];
    return isPrivateIpv4([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'));
  }
  return /^(fc|fd|fe[89ab])/.test(h); // unique-local fc00::/7, link-local fe80::/10
}

export function isInternalHost(hostname: string): boolean {
  const host = canonicalHost(hostname);
  if (host === '') return true;
  if (host === 'localhost' || INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) return true;
  return !host.includes('.') && !host.includes(':'); // single-label: postgres, redis, metadata…
}

export function isInternalUrl(raw: string): boolean {
  const url = parse(raw);
  if (!url) return false;
  if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return false;
  return isInternalHost(url.hostname);
}
