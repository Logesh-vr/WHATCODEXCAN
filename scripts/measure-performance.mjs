import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const target = process.env.PERF_URL || 'http://127.0.0.1:4173';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname))
  throw new Error('Performance checks must target a local preview.');
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
});
const samples = [];
try {
  for (let i = 0; i < 5; i++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__faultlineLCP = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__faultlineLCP = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(target, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    const navigation = await page.evaluate(async () => {
      await document.fonts.ready;
      const timing = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoadedMs: timing.domContentLoadedEventEnd,
        loadMs: timing.loadEventEnd,
        largestContentfulPaintMs: window.__faultlineLCP,
        transferredBytes: performance
          .getEntriesByType('resource')
          .reduce((n, r) => n + r.transferSize, timing.transferSize),
      };
    });
    const session = await context.newCDPSession(page);
    const heap = await session.send('Runtime.getHeapUsage');
    await page.getByRole('tab', { name: 'Stress test' }).click();
    const interactionMs = [];
    for (const value of [10, 25, 40, 55, 70, 85, 100]) {
      const start = performance.now();
      await page.locator('#scenario-weight').fill(String(value));
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      interactionMs.push(performance.now() - start);
    }
    samples.push({ ...navigation, jsHeapUsedBytes: heap.usedSize, interactionMs });
    await context.close();
  }
} finally {
  await browser.close();
}
const result = {
  measuredAt: new Date().toISOString(),
  target,
  method:
    'Five fresh Edge/Chromium contexts, production preview on loopback, 1440x1000, no CPU/network throttling. Interaction includes Playwright fill round-trip and two animation frames. Heap excludes browser process and GPU memory.',
  samples,
};
mkdirSync('docs/measurements', { recursive: true });
writeFileSync('docs/measurements/frontend.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
