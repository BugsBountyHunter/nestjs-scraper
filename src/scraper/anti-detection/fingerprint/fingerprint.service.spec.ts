import { FingerprintService } from './fingerprint.service';

describe('FingerprintService', () => {
  let service: FingerprintService;

  beforeEach(() => {
    service = new FingerprintService();
  });

  describe('generateProfile()', () => {
    it('returns a complete profile with all required fields', () => {
      const profile = service.generateProfile();

      expect(profile.userAgent).toBeTruthy();
      expect(profile.viewport.width).toBeGreaterThan(0);
      expect(profile.viewport.height).toBeGreaterThan(0);
      expect(profile.locale).toBeTruthy();
      expect(profile.timezone).toBeTruthy();
      expect(profile.platform).toBeTruthy();
      expect(profile.hardwareConcurrency).toBeGreaterThan(0);
      expect(profile.colorDepth).toBe(24);
    });

    it('generates different profiles across 10 calls', () => {
      const profiles = Array.from({ length: 10 }, () => service.generateProfile());
      const userAgents = new Set(profiles.map((p) => p.userAgent));
      const viewports = new Set(profiles.map((p) => `${p.viewport.width}x${p.viewport.height}`));
      const timezones = new Set(profiles.map((p) => p.timezone));

      // With 10 samples from 5+ pools we expect at least 2 distinct values each
      expect(userAgents.size).toBeGreaterThanOrEqual(2);
      expect(viewports.size).toBeGreaterThanOrEqual(2);
      expect(timezones.size).toBeGreaterThanOrEqual(2);
    });

    it('returns viewports from the allowed set', () => {
      const allowed = new Set(['1920x1080', '1366x768', '1440x900', '1536x864', '1280x720']);
      for (let i = 0; i < 20; i++) {
        const { viewport } = service.generateProfile();
        expect(allowed.has(`${viewport.width}x${viewport.height}`)).toBe(true);
      }
    });

    it('returns locales from the allowed set', () => {
      const allowed = new Set(['en-US', 'en-GB', 'en-CA', 'de-DE', 'fr-FR']);
      for (let i = 0; i < 20; i++) {
        expect(allowed.has(service.generateProfile().locale)).toBe(true);
      }
    });
  });

  describe('buildSecChUa()', () => {
    it('returns Chrome 122 header for a Chrome 122 user-agent', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const header = service.buildSecChUa(ua);
      expect(header).toContain('"Google Chrome";v="122"');
      expect(header).toContain('"Chromium";v="122"');
    });

    it('returns Chrome 121 header for a Chrome 121 user-agent', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
      const header = service.buildSecChUa(ua);
      expect(header).toContain('"Chromium";v="121"');
    });

    it('returns a fallback header for unrecognized user-agents', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Safari/605.1.15';
      const header = service.buildSecChUa(ua);
      expect(header).toBeTruthy();
      expect(header).not.toContain('"Google Chrome";v="122"');
    });
  });
});
