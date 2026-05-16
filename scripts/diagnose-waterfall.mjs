// Check resource waterfall and render-blocking resources.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  await page.goto(BASE + "/services", { waitUntil: "networkidle" });

  const data = await page.evaluate(() => {
    const paints = performance.getEntriesByType("paint");
    const fp = paints.find((p) => p.name === "first-paint")?.startTime;
    const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime;
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource").map((r) => ({
      url: r.name.replace(/^https?:\/\/[^/]+/, ""),
      type: r.initiatorType,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      renderBlocking: r.renderBlockingStatus || "—",
      transfer: r.transferSize,
    })).sort((a, b) => a.start - b.start);
    return {
      domContentLoaded: nav?.domContentLoadedEventEnd,
      domInteractive: nav?.domInteractive,
      loadEnd: nav?.loadEventEnd,
      responseStart: nav?.responseStart,
      responseEnd: nav?.responseEnd,
      firstPaint: fp,
      fcp,
      resources,
    };
  });

  console.log("navigation timeline:");
  console.log(`  responseStart  ${data.responseStart?.toFixed(0)}ms (HTML byte 0)`);
  console.log(`  responseEnd    ${data.responseEnd?.toFixed(0)}ms (HTML last byte)`);
  console.log(`  domInteractive ${data.domInteractive?.toFixed(0)}ms`);
  console.log(`  DCL            ${data.domContentLoaded?.toFixed(0)}ms`);
  console.log(`  firstPaint     ${data.firstPaint?.toFixed(0)}ms`);
  console.log(`  FCP            ${data.fcp?.toFixed(0)}ms`);
  console.log(`  load           ${data.loadEnd?.toFixed(0)}ms`);

  console.log("\nresources by start time (first 25):");
  console.log("  start  end  bytes  blocking            type   url");
  for (const r of data.resources.slice(0, 25)) {
    const u = r.url.length > 70 ? "…" + r.url.slice(-69) : r.url;
    console.log(`  ${String(r.start).padStart(5)}  ${String(r.end).padStart(4)}  ${String(r.transfer).padStart(6)}  ${String(r.renderBlocking).padEnd(18)}  ${r.type.padEnd(6)} ${u}`);
  }

  // What was the render-blocking CSS chain?
  console.log("\nrender-blocking resources only:");
  for (const r of data.resources.filter((r) => r.renderBlocking === "blocking")) {
    console.log(`  ${r.start.toString().padStart(4)}→${r.end.toString().padStart(4)}ms  ${r.transfer}B  ${r.url}`);
  }
  await browser.close();
})();
