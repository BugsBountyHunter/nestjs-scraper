import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright-extra';
import { BrowserFactoryService } from './browser-factory.service';
import { FingerprintService } from '../anti-detection/fingerprint/fingerprint.service';

jest.mock('playwright-extra', () => ({
  chromium: { use: jest.fn(), connect: jest.fn(), launchPersistentContext: jest.fn() },
}));
jest.mock('puppeteer-extra-plugin-stealth', () => () => ({ enabledEvasions: new Set() }));

const mockedChromium = chromium as unknown as {
  connect: jest.Mock;
  launchPersistentContext: jest.Mock;
};

function makeContext() {
  return { setDefaultTimeout: jest.fn(), addInitScript: jest.fn().mockResolvedValue(undefined) };
}

function makeBrowser() {
  const listeners: Record<string, () => void> = {};
  return {
    newContext: jest.fn().mockImplementation(async () => makeContext()),
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    close: jest.fn().mockResolvedValue(undefined),
    emit: (event: string) => listeners[event]?.(),
  };
}

function makeFactory(env: Record<string, string>) {
  const config = { get: (key: string, def?: unknown) => env[key] ?? def } as unknown as ConfigService;
  return new BrowserFactoryService(config, new FingerprintService());
}

describe('BrowserFactoryService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('remote mode (BROWSER_WS_ENDPOINT set)', () => {
    const env = { BROWSER_WS_ENDPOINT: 'ws://browser:3333/secret-token' };

    it('creates contexts on the remote browser, never launching locally', async () => {
      const browser = makeBrowser();
      mockedChromium.connect.mockResolvedValue(browser);
      const factory = makeFactory(env);

      const created = await factory.createContext({ url: 'http://proxy:1', user: 'u', pass: 'p' } as never);

      expect(mockedChromium.connect).toHaveBeenCalledWith('ws://browser:3333/secret-token', expect.any(Object));
      expect(mockedChromium.launchPersistentContext).not.toHaveBeenCalled();
      expect(browser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceWorkers: 'block',
          proxy: { server: 'http://proxy:1', username: 'u', password: 'p' },
        }),
      );
      expect(created.userDataDir).toBe('');
      expect(created.context.addInitScript).toHaveBeenCalled();
    });

    it('reuses one connection across contexts', async () => {
      mockedChromium.connect.mockResolvedValue(makeBrowser());
      const factory = makeFactory(env);
      await factory.createContext(null);
      await factory.createContext(null);
      expect(mockedChromium.connect).toHaveBeenCalledTimes(1);
    });

    it('reconnects after the browser container disconnects', async () => {
      const first = makeBrowser();
      mockedChromium.connect.mockResolvedValueOnce(first).mockResolvedValueOnce(makeBrowser());
      const factory = makeFactory(env);

      await factory.createContext(null);
      first.emit('disconnected');
      await factory.createContext(null);

      expect(mockedChromium.connect).toHaveBeenCalledTimes(2);
    });

    it('retries the connection after a failed connect', async () => {
      mockedChromium.connect.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce(makeBrowser());
      const factory = makeFactory(env);

      await expect(factory.createContext(null)).rejects.toThrow('ECONNREFUSED');
      await expect(factory.createContext(null)).resolves.toBeDefined();
    });

    it('never leaks the ws token in connect errors', async () => {
      mockedChromium.connect.mockRejectedValue(
        new Error('browserType.connect: connect ECONNREFUSED ws://browser:3333/secret-token'),
      );
      const factory = makeFactory(env);

      const err = await factory.createContext(null).catch((e: Error) => e);

      expect((err as Error).message).not.toContain('secret-token');
      expect((err as Error).message).toContain('<redacted>');
    });

    it('rejects a non-websocket endpoint at startup', () => {
      expect(() => makeFactory({ BROWSER_WS_ENDPOINT: 'http://browser:3333' })).toThrow(/ws:\/\//);
    });
  });

  describe('local mode', () => {
    it('launches a persistent context with the stealth args', async () => {
      mockedChromium.launchPersistentContext.mockResolvedValue(makeContext());
      const factory = makeFactory({});

      const created = await factory.createContext(null);

      expect(mockedChromium.connect).not.toHaveBeenCalled();
      const [dir, opts] = mockedChromium.launchPersistentContext.mock.calls[0];
      expect(created.userDataDir).toBe(dir);
      expect(opts.args).toContain('--disable-blink-features=AutomationControlled');
      expect(opts.serviceWorkers).toBe('block');
      expect(opts.proxy).toBeUndefined();
    });
  });
});
