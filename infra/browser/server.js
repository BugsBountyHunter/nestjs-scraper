// Remote Playwright server for the network-isolated browser container.
// The app connects with chromium.connect(BROWSER_WS_ENDPOINT); contexts and
// pages live here, so the browser's network egress is governed by this
// container's firewall (entrypoint.sh), not the app's network.
const { chromium } = require('playwright-core');

const token = process.env.BROWSER_WS_TOKEN;
if (!token || token.length < 24) {
  console.error('BROWSER_WS_TOKEN must be set (>= 24 chars) — it is the only auth on this endpoint');
  process.exit(1);
}

(async () => {
  const server = await chromium.launchServer({
    host: '0.0.0.0',
    port: Number(process.env.BROWSER_PORT || 3333),
    wsPath: `/${token}`,
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    // Keep in sync with CHROMIUM_ARGS in src/scraper/browser/browser-factory.service.ts
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  console.log(`Playwright browser server listening on port ${process.env.BROWSER_PORT || 3333}`);

  const shutdown = () => server.close().finally(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})().catch((err) => {
  console.error('Failed to start browser server:', err);
  process.exit(1);
});
