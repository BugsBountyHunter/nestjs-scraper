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

// Non-public IPv4 ranges (IANA special-purpose registry). Mirrored by the
// iptables egress rules in infra/browser/entrypoint.sh — keep in sync.
const BLOCKED_IPV4_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local / cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function ipv4ToInt(host: string): number | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => !Number.isInteger(n) || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

export function isPrivateIpv4(host: string): boolean {
  const ip = ipv4ToInt(host);
  if (ip === null) return false;
  return BLOCKED_IPV4_CIDRS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ip & mask) === ((ipv4ToInt(base) as number) & mask);
  });
}

/** Expands an IPv6 literal (incl. embedded dotted IPv4) to 8 16-bit groups. */
function expandIpv6(raw: string): number[] | null {
  let h = raw.replace(/^\[|\]$/g, '').toLowerCase().split('%')[0];
  const dotted = h.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const v4 = ipv4ToInt(dotted[1]);
    if (v4 === null) return null;
    h = h.slice(0, -dotted[1].length) + `${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = h.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

const v4FromGroups = (hi: number, lo: number): string => [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');

export function isPrivateIpv6(host: string): boolean {
  if (!host.includes(':')) return false;
  const g = expandIpv6(host);
  if (!g) return true; // unparsable literal — fail closed
  const zeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);

  if (zeroPrefix(8)) return true; // ::
  if (zeroPrefix(7) && g[7] === 1) return true; // ::1
  if (zeroPrefix(6)) return true; // deprecated IPv4-compatible ::a.b.c.d
  if (zeroPrefix(5) && g[5] === 0xffff) return isPrivateIpv4(v4FromGroups(g[6], g[7])); // IPv4-mapped
  if (g[0] === 0x64 && g[1] === 0xff9b) return isPrivateIpv4(v4FromGroups(g[6], g[7])); // NAT64 64:ff9b::/96
  if (g[0] === 0x2002) return isPrivateIpv4(v4FromGroups(g[1], g[2])); // 6to4 2002::/16
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo 2001::/32 (tunnels to arbitrary v4)
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if ((g[0] & 0xfe00) === 0xfc00) return true; // unique-local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // deprecated site-local fec0::/10
  return (g[0] & 0xff00) === 0xff00; // multicast ff00::/8
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
