// Paint-timing probe. Uses Performance API to measure WHEN each image
// is requested relative to navigationStart and the first paint.
//
// Critical metric: if responseEnd of a card image is BEFORE
// firstContentfulPaint, the user sees no flash. If responseEnd is AFTER
// firstContentfulPaint, that's the visible image pop.

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ROUTES = ["/services", "/requests", "/marketplace"];

async function probe(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // Force a fresh load with cache disabled to simulate hard refresh.
  await page.context().clearCookies();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });

  const data = await page.evaluate(() => {
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
    const fp = paints.find((p) => p.name === "first-paint")?.startTime ?? null;
    const lcp = (() => {
      try {
        const obs = performance.getEntriesByType("largest-contentful-paint");
        return obs.length ? obs[obs.length - 1].startTime : null;
      } catch { return null; }
    })();

    const imgs = performance.getEntriesByType("resource").filter((r) => r.initiatorType === "img" || r.name.includes("/_next/image") || r.name.endsWith("logo.svg"));
    return {
      fp,
      fcp,
      lcp,
      images: imgs.map((r) => ({
        url: r.name.replace(/^https?:\/\/[^/]+/, ""),
        start: Math.round(r.startTime),
        end: Math.round(r.responseEnd),
        duration: Math.round(r.duration),
        encoded: r.encodedBodySize,
        transfer: r.transferSize,
        cached: r.transferSize === 0 && r.encodedBodySize > 0,
        initiator: r.initiatorType,
      })),
    };
  });

  await page.close();
  return { route, ...data };
}

(async () => {
  const browser = await chromium.launch();
  for (const route of ROUTES) {
    const r = await probe(browser, route);
    console.log(`\n=== ${route} ===`);
    console.log(`  FP=${r.fp?.toFixed(0)}ms  FCP=${r.fcp?.toFixed(0)}ms  LCP=${r.lcp?.toFixed(0)}ms`);
    console.log(`  ${'url'.padEnd(60)} start  end   d    transfer  init  vs-FCP`);
    for (const i of r.images.slice(0, 10)) {
      const short = i.url.length > 58 ? "…" + i.url.slice(-57) : i.url;
      const vsFcp = r.fcp != null ? (i.end - r.fcp).toFixed(0) + "ms" : "—";
      const vsTag = r.fcp != null && i.end <= r.fcp ? "✓ before FCP" : "✗ after FCP";
      console.log(`  ${short.padEnd(60)} ${String(i.start).padStart(5)}  ${String(i.end).padStart(5)}  ${String(i.duration).padStart(4)}  ${String(i.transfer).padStart(6)}    ${i.initiator.padEnd(6)} ${vsFcp.padStart(7)}  ${vsTag}`);
    }
  }
  await browser.close();
})();
