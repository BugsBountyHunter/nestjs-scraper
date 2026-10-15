/**
 * Anonymizes captured LinkedIn fixtures in place and fails if any member
 * name/slug token survives. Run after `capture:fixtures` (which also calls
 * the anonymizer itself) or on its own:
 *
 *   npm run fixtures:anonymize
 */
import * as fs from 'fs';
import * as path from 'path';
import { anonymizeFixtureHtml, findLeaks } from '../src/pipeline/parsers/testing/anonymize-fixture';

const FIXTURES_DIR = path.join(__dirname, '../src/pipeline/parsers/__fixtures__');
// Hand-written synthetic fixtures contain no real members; only captured pages are processed.
const CAPTURED = ['profile.html', 'jobs.html', 'company.html'];

let leaked = false;
for (const file of CAPTURED) {
  const filePath = path.join(FIXTURES_DIR, file);
  if (!fs.existsSync(filePath)) continue;

  const before = fs.readFileSync(filePath, 'utf8');
  const { html, report } = anonymizeFixtureHtml(before);
  fs.writeFileSync(filePath, html, 'utf8');

  const leaks = findLeaks(html, report.leakTokens);
  console.log(`${file}: ${report.members} member(s) anonymized${leaks.length ? ` — LEAKS: ${leaks.join(', ')}` : ''}`);
  leaked = leaked || leaks.length > 0;
}

if (leaked) {
  console.error('Personal data survived anonymization — fix before committing fixtures.');
  process.exit(1);
}
