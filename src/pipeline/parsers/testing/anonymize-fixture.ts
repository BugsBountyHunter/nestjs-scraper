/**
 * Strips personal data from captured LinkedIn HTML before it is committed as
 * a parser fixture. Organization data (company names, logos) is public and
 * kept; anything about individual members, and identifiers tied to the
 * capture session, is replaced with stable placeholders so selectors and
 * structure stay intact for the parser tests.
 */

export interface AnonymizeReport {
  /** Distinct members (people) found and replaced. */
  members: number;
  /** Lower-cased surname/slug tokens to assert absent afterwards (see findLeaks). */
  leakTokens: string[];
}

interface Member {
  index: number;
  slugs: Set<string>;
  names: Set<string>;
}

const PLACEHOLDER_SLUG = /^member-\d+$/;
const PLACEHOLDER_NAME = /^Member \d+$/;
const PHOTO_PLACEHOLDER = 'https://static.licdn.com/aero-v1/sc/h/anonymized-member-photo';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const ALT_NAME_PATTERNS = [/alt="Click here to view (.+?)’s profile"/g, /alt="View profile for (.+?)"/g];

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripTags = (s: string): string =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** `mindy-kay-brooks` → `Mindy Kay Brooks`; `thomas-kurian-469b6219` → `Thomas Kurian`; `myelin` → null. */
function nameFromSlug(slug: string): string | null {
  const parts = safeDecode(slug)
    .split('-')
    .filter((p) => !/\d/.test(p));
  if (parts.length < 2 || parts.some((p) => !/^\p{L}+$/u.test(p))) return null;
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
}

/** Name plus its HTML numeric-entity spellings (`Darío` → `Dar&#237;o`, `Dar&#xed;o`). */
function spellings(name: string): string[] {
  const dec = name.replace(/[^\x20-\x7e]/gu, (ch) => `&#${ch.codePointAt(0)};`);
  const hex = name.replace(/[^\x20-\x7e]/gu, (ch) => `&#x${(ch.codePointAt(0) as number).toString(16)};`);
  return [...new Set([name, dec, hex])];
}

function collectMembers(html: string): Member[] {
  const byKey = new Map<string, Member>();
  const members: Member[] = [];
  const memberFor = (key: string): Member => {
    let m = byKey.get(key);
    if (!m) {
      m = { index: members.length + 1, slugs: new Set(), names: new Set() };
      byKey.set(key, m);
      members.push(m);
    }
    return m;
  };
  const addName = (m: Member, raw: string): void => {
    const name = raw.trim();
    if (name && !PLACEHOLDER_NAME.test(name)) m.names.add(name);
  };

  const anchor = /<a\b[^>]*href="[^"]*linkedin\.com\/in\/([A-Za-z0-9%_-]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  for (const [, slug, inner] of html.matchAll(anchor)) {
    if (PLACEHOLDER_SLUG.test(slug)) continue;
    const m = memberFor(safeDecode(slug).toLowerCase());
    m.slugs.add(slug);
    addName(m, stripTags(inner));
    for (const re of ALT_NAME_PATTERNS) for (const [, n] of inner.matchAll(re)) addName(m, n);
    const fromSlug = nameFromSlug(slug);
    if (fromSlug) addName(m, fromSlug);
  }

  // Alt-text names with no profile link: attach to a known member or create one.
  for (const re of ALT_NAME_PATTERNS) {
    for (const [, n] of html.matchAll(re)) {
      if (PLACEHOLDER_NAME.test(n) || members.some((m) => m.names.has(n))) continue;
      addName(memberFor(`name:${n}`), n);
    }
  }
  return members.filter((m) => m.names.size > 0 || m.slugs.size > 0);
}

function replaceMembers(html: string, members: Member[]): string {
  let out = html;
  for (const m of members) {
    for (const slug of m.slugs) {
      out = out.replace(new RegExp(`/in/${escapeRegex(slug)}(?=[?"/&#\\s]|$)`, 'g'), `/in/member-${m.index}`);
    }
  }

  // Full names first (longest first), then first names, so "Mindy Kay Brooks"
  // is not half-replaced by "Mindy".
  const fullNames = members.flatMap((m) => [...m.names].map((n) => ({ n, m })));
  const firstNames = fullNames
    .map(({ n, m }) => ({ n: n.split(' ')[0], m }))
    .filter(({ n }) => n.length >= 3 && !/\.$/.test(n));
  const ordered = [...fullNames.sort((a, b) => b.n.length - a.n.length), ...firstNames];

  for (const { n, m } of ordered) {
    for (const spelling of spellings(n)) {
      const re = new RegExp(`(?<![\\p{L}&#])${escapeRegex(spelling)}(?![\\p{L}])`, 'gu');
      out = out.replace(re, `Member ${m.index}`);
    }
  }
  return out;
}

function scrubPhotosAndTracking(html: string): string {
  return html
    .replace(/https:\/\/media\.licdn\.com\/dms\/image\/[^"'\s]*profile-(?:displayphoto|framedphoto)[^"'\s]*/g, PHOTO_PLACEHOLDER)
    .replace(/session_id=[0-9a-f-]{36}/gi, `session_id=${ZERO_UUID}`)
    .replace(/instanceId=[^&"'\s]+/g, 'instanceId=anonymized')
    .replace(/\b(refId|trackingId)=[^&"'\s]+/g, '$1=anonymized')
    .replace(/"trackingId":"[^"]*"/g, '"trackingId":"anonymized"')
    .replace(/&quot;trackingId&quot;:&quot;[^&]*&quot;/g, '&quot;trackingId&quot;:&quot;anonymized&quot;')
    .replace(/(urn:li:page:[^;"&]+);[^"&\s]+/g, '$1;anonymized');
}

export function anonymizeFixtureHtml(html: string): { html: string; report: AnonymizeReport } {
  const members = collectMembers(html);
  const out = scrubPhotosAndTracking(replaceMembers(html, members));

  const leakTokens = [
    ...new Set(
      members.flatMap((m) => [
        ...[...m.names].map((n) => n.split(' ').slice(-1)[0]),
        ...[...m.slugs].flatMap((s) => safeDecode(s).split('-')),
      ]),
    ),
  ]
    .map((t) => t.toLowerCase().replace(/\.$/, ''))
    .filter((t) => t.length >= 4 && !/\d/.test(t));

  return { html: out, report: { members: members.length, leakTokens } };
}

/** Tokens from `tokens` still present in `html` (case-insensitive). */
export function findLeaks(html: string, tokens: string[]): string[] {
  const lower = html.toLowerCase();
  return tokens.filter((t) => lower.includes(t.toLowerCase()));
}
