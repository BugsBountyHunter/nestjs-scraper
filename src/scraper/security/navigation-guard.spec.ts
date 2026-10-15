import type { Page, Request, Route } from 'playwright';
import { installNavigationGuard, NavigationBlockedError } from './navigation-guard';

type Handler = (route: Route, request: Request) => Promise<void> | void;

function setup() {
  const mainFrame = {};
  let handler: Handler | undefined;
  const page = {
    mainFrame: () => mainFrame,
    route: jest.fn(async (_pattern: string, h: Handler) => {
      handler = h;
    }),
  } as unknown as Page;

  const fire = async (url: string, opts: { navigation?: boolean; subframe?: boolean } = {}) => {
    const route = { abort: jest.fn(), continue: jest.fn() };
    const request = {
      url: () => url,
      isNavigationRequest: () => opts.navigation ?? false,
      frame: () => (opts.subframe ? {} : mainFrame),
    };
    await handler!(route as unknown as Route, request as unknown as Request);
    return route;
  };
  return { page, fire };
}

describe('installNavigationGuard', () => {
  it('lets LinkedIn navigations and external sub-resources through', async () => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page);

    expect((await fire('https://www.linkedin.com/in/x', { navigation: true })).continue).toHaveBeenCalled();
    expect((await fire('https://static.licdn.com/app.js')).continue).toHaveBeenCalled();
    expect(() => guard.assertNotBlocked()).not.toThrow();
  });

  it('blocks a top-level redirect off LinkedIn', async () => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page);

    const route = await fire('https://evil.com/', { navigation: true });

    expect(route.abort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.blockedUrl()).toBe('https://evil.com/');
    expect(() => guard.assertNotBlocked()).toThrow(NavigationBlockedError);
  });

  it('blocks any request to an internal host, even sub-resources', async () => {
    const { page, fire } = setup();
    const guard = await installNavigationGuard(page);

    expect((await fire('http://169.254.169.254/latest/meta-data')).abort).toHaveBeenCalled();
    expect((await fire('http://redis:6379/', { navigation: true, subframe: true })).abort).toHaveBeenCalled();
    expect(guard.blockedUrl()).toBe('http://169.254.169.254/latest/meta-data');
  });

  it('allows non-LinkedIn iframes (e.g. CAPTCHA widgets)', async () => {
    const { page, fire } = setup();
    await installNavigationGuard(page);
    const route = await fire('https://www.google.com/recaptcha/api2/anchor', { navigation: true, subframe: true });
    expect(route.continue).toHaveBeenCalled();
  });
});
