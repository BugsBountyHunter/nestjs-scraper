import { isAllowedTargetUrl, isInternalUrl } from './url-policy';

describe('isAllowedTargetUrl', () => {
  it.each([
    'https://www.linkedin.com/in/someone/',
    'https://linkedin.com/company/acme',
    'https://uk.linkedin.com/in/x',
    'https://WWW.LINKEDIN.COM/in/x',
    'https://www.linkedin.com:443/in/x',
  ])('accepts %s', (url) => expect(isAllowedTargetUrl(url)).toBe(true));

  it.each([
    'http://www.linkedin.com/in/x',
    'https://www.linkedin.com:22/',
    'https://www.linkedin.com:8443/in/x',
    'https://user:pass@www.linkedin.com/in/x',
    'https://www.linkedin.com@evil.com/',
    'https://www.linkedin.com.evil.com/',
    'https://evil.com#www.linkedin.com',
    'https://notlinkedin.com/',
    'https://a.b.linkedin.com/',
    'https://169.254.169.254/latest/meta-data',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (url) => expect(isAllowedTargetUrl(url)).toBe(false));
});

describe('isInternalUrl', () => {
  it.each([
    'http://localhost:3000/health',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://172.20.1.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://postgres:5432/',
    'http://redis/',
    'http://api.internal/',
    'http://printer.local/',
  ])('flags %s as internal', (url) => expect(isInternalUrl(url)).toBe(true));

  it.each([
    'https://www.linkedin.com/',
    'https://static.licdn.com/x.js',
    'https://8.8.8.8/',
    'https://172.32.0.1/',
    'https://www.google.com/recaptcha/api.js',
    'data:text/plain,hi',
    'about:blank',
  ])('allows %s', (url) => expect(isInternalUrl(url)).toBe(false));
});
