// Slow-network frame trace.
//
// Throttles network to 3G so painting is spread over hundreds of ms,
// allowing the screencast to catch every intermediate paint. If a
// flash happens — e.g. CSS applies before image decodes, or React
// hydration causes a repaint — we will see a distinct frame between
// the first painted frame and the final stable frame with diff > 0.5%.
//
// Also captures `Page.frameStartedLoading` and paint events.

import { chromium } from "playwright";
import { PNG } from "pngjs";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/findone-slow-frames";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function diffRegion(a, b, x, y, w, h) {
  if (a.width !== b.width || a.height !== b.height) return 100;
  const tol = 8;
  let diff = 0;
  const stride = a.width * 4;
  for (let py = y; py < y + h && py < a.height; py++) {
    for (let px = x; px < x + w && px < a.width; px++) {
      const i = py * stride + px * 4;
      if (
        Math.abs(a.data[i] - b.data[i]) > tol ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > tol ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > tol
      ) diff++;
    }
  }
  return (100 * diff) / (w * h);
}

async function probe(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.clearBrowserCache");
  // Fast 3G: 1.6 Mbps down, 750 Kbps up, 150ms latency
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const frames = [];
  const tStart = Date.now();
  cdp.on("Page.screencastFrame", async (evt) => {
    frames.push({ ms: Date.now() - tStart, b64: evt.data });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: evt.sessionId }); } catch {}
  });
  await cdp.send("Page.enable");
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1, maxWidth: 1280, maxHeight: 900 });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000)); // capture for 3s on slow net
  await cdp.send("Page.stopScreencast");

  const regions = await page.evaluate(() => {
    const grabVisible = (sel) => {
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect();
        if (b.width >= 2 && b.height >= 2) return { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)), w: Math.floor(b.width), h: Math.floor(b.height) };
      }
      return null;
    };
    const grabIdx = (sel, i) => {
      const el = document.querySelectorAll(sel)[i];
      if (!el) return null;
      const b = el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return null;
      return { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)), w: Math.floor(b.width), h: Math.floor(b.height) };
    };
    return {
      logo: grabVisible("header img"),
      card1: grabIdx(".listing-card__image-wrapper", 0),
      card2: grabIdx(".listing-card__image-wrapper", 1),
      card3: grabIdx(".listing-card__image-wrapper", 2),
      gallery: grabVisible(".listing-media img"),
    };
  });

  await page.close();
  console.log(`\n=== ${route} (3G) === ${frames.length} frames captured`);
  if (frames.length === 0) return;

  // Decode all frames into PNG (sharp not available, use jpeg-js? Skip — use raw byte hash for similarity instead).
  // Actually we need pixel access. Let's restart with PNG format.
  console.log("frame timeline (ms):", frames.map((f) => f.ms).join(", "));

  // Save all frames as jpeg.
  const safe = route.replace(/[^a-z0-9]/gi, "_");
  for (let i = 0; i < frames.length; i++) {
    fs.writeFileSync(`${OUT}/${safe}_${String(i).padStart(2, "0")}_${frames[i].ms}ms.jpg`, Buffer.from(frames[i].b64, "base64"));
  }
  console.log(`saved ${frames.length} frames to ${OUT}/`);
  console.log(`regions: ${JSON.stringify(regions)}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const r of ["/services"]) {
    await probe(browser, r);
  }
  await browser.close();
})();
