import type { BrowserContext, Page, Request, Route } from 'playwright';
import { installNavigationGuard, NavigationBlockedError, HostResolver } from './navigation-guard';

type Handler = (route: Route, request: Request) => Promise<void> | void;

const PUBLIC_DNS: Record<string, string[]> = {
  'www.linkedin.com': ['13.107.42.14'],
  'static.licdn.com': ['23.0.0.1'],
  'www.google.com': ['142.250.0.1'],
  'evil.com': ['93.184.216.34'],
  '127.0.0.1.nip.io': ['127.0.0.1'],
  'rebind.example': ['93.184.216.34', '10.0.0.7'],
};
const resolver: HostResolver = async (host) => {
  const addrs = PUBLIC_DNS[host];
  if (!addrs) throw new Error('ENOTFOUND');
  return addrs;
};

function setup() {
  let handler: Handler | undefined;
  const context = {
    route: jest.fn(async (_p: string, h: Handler) => {
      handler = h;
    }),
    on: jest.fn(),
  } as unknown as BrowserContext;
  const makePage = () => ({ context: () => context }) as unknown as Page;
  const page = makePage();

  const fire = async (url: string, opts: { navigation?: boolean; subframe?: boolean; from?: Page } = {}) => {
    const route = { abort: jest.fn(), continue: jest.fn() };
    const frame = { parentFrame: () => (opts.subframe ? {} : null), page: () => opts.from ?? page };
    const request = { url: () => url, isNavigationRequest: () => opts.navigation ?? false, frame: () => frame };
    await handler!(route as unknown as Route, request as unknown as Request);
    return route;
  };
  return { page, makePage, context, fire };
}

describe('installNavigationGuard', () => {
  it('installs the route once per context', async () => {
    const { page, makePage, context } = setup();
    await installNavigationGuard(page, resolver);
    await installNavigationGuard(makePage(), resolver);
    expect(context.route).toHaveBeenCalledTimes(1);
  });

  it('lets LinkedIn navigations and public sub-resources through', async () => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page, resolver);

    expect((await fire('https://www.linkedin.com/in/x', { navigation: true })).continue).toHaveBeenCalled();
    expect((await fire('https://static.licdn.com/app.js')).continue).toHaveBeenCalled();
    expect((await fire('data:image/png;base64,AAAA')).continue).toHaveBeenCalled();
    expect(() => guard.assertNotBlocked()).not.toThrow();
  });

  it('blocks a top-level redirect off LinkedIn', async () => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page, resolver);

    const route = await fire('https://evil.com/', { navigation: true });

    expect(route.abort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.blockedUrl()).toBe('https://evil.com/');
    expect(() => guard.assertNotBlocked()).toThrow(NavigationBlockedError);
  });

  it.each([
    'http://169.254.169.254/latest/meta-data',
    'http://localhost./',
    'http://redis./',
    'http://127.0.0.1.nip.io/',
    'http://rebind.example/',
    'http://unresolvable.example/',
  ])('blocks sub-resource request to internal target %s', async (url) => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page, resolver);
    expect((await fire(url)).abort).toHaveBeenCalled();
    expect(guard.blockedUrl()).toBe(url);
  });

  it('enforces the allow-list on popup main frames too', async () => {
    const { page, makePage, fire } = setup();
    await installNavigationGuard(page, resolver);
    const popup = makePage();
    const route = await fire('https://evil.com/', { navigation: true, from: popup });
    expect(route.abort).toHaveBeenCalled();
  });

  it('allows public non-LinkedIn iframes (e.g. CAPTCHA widgets)', async () => {
    const { page, fire } = setup();
    await installNavigationGuard(page, resolver);
    const route = await fire('https://www.google.com/recaptcha/api2/anchor', { navigation: true, subframe: true });
    expect(route.continue).toHaveBeenCalled();
  });
});
