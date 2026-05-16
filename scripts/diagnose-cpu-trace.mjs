// CPU-throttled frame trace.
//
// Slow CPU (4x) so hydration is stretched and any hydration-induced
// repaint becomes capturable as distinct frames.

import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const ROUTES = ["/services", "/marketplace"];
const OUT = "/tmp/findone-cpu-frames";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

async function probe(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.clearBrowserCache");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

  const frames = [];
  const tStart = Date.now();
  cdp.on("Page.screencastFrame", async (evt) => {
    frames.push({ ms: Date.now() - tStart, buf: Buffer.from(evt.data, "base64") });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: evt.sessionId }); } catch {}
  });
  await cdp.send("Page.enable");
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1, maxWidth: 1280, maxHeight: 900 });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
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
      return b.width < 2 ? null : { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)), w: Math.floor(b.width), h: Math.floor(b.height) };
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

  const decoded = [];
  for (const f of frames) {
    const r = await sharp(f.buf).raw().toBuffer({ resolveWithObject: true });
    decoded.push({ ms: f.ms, data: r.data, info: r.info, buf: f.buf });
  }
  if (decoded.length === 0) { console.log("no frames"); return; }
  const final = decoded[decoded.length - 1];

  function diff(a, b, x, y, w, h) {
    if (a.info.width !== b.info.width) return 100;
    const stride = a.info.width * 3;
    let d = 0; const tol = 8;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const i = py * stride + px * 3;
        if (Math.abs(a.data[i] - b.data[i]) > tol || Math.abs(a.data[i+1] - b.data[i+1]) > tol || Math.abs(a.data[i+2] - b.data[i+2]) > tol) d++;
      }
    }
    return (100 * d) / (w * h);
  }

  console.log(`\n=== ${route} (6x CPU throttle) ===`);
  console.log(`captured ${decoded.length} frames over ${final.ms}ms`);
  const cols = Object.entries(regions).filter(([, r]) => r);

  // Pre-compute diffs per frame
  const ROWS = decoded.map((f) => {
    const obj = { ms: f.ms };
    for (const [k, r] of cols) obj[k] = diff(f, final, r.x, r.y, r.w, r.h);
    return obj;
  });

  // Look for any frame where region was stable then UN-stable then stable again (= repaint).
  console.log(`\nframes where any region has 0.5–95% diff (mid-paint, not fully stable, not blank):`);
  console.log("ms    " + cols.map(([k]) => k.padEnd(8)).join("  "));
  let printed = 0;
  for (const r of ROWS) {
    const inMid = cols.some(([k]) => r[k] > 0.5 && r[k] < 95);
    if (inMid) {
      console.log(String(r.ms).padStart(4) + "  " + cols.map(([k]) => r[k].toFixed(2).padStart(6) + "%  ").join(""));
      printed++;
      if (printed > 25) break;
    }
  }
  if (printed === 0) console.log("  (none — every frame is either fully stable or fully blank)");

  // Save first 12 frames + last
  const safe = route.replace(/[^a-z0-9]/gi, "_");
  const toSave = [...decoded.slice(0, 14), decoded[decoded.length - 1]];
  for (let i = 0; i < toSave.length; i++) {
    fs.writeFileSync(`${OUT}/${safe}_${String(i).padStart(2, "0")}_${toSave[i].ms}ms.jpg`, toSave[i].buf);
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const r of ROUTES) await probe(browser, r);
  // detail
  try {
    const p = await browser.newPage();
    await p.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
    const href = await p.evaluate(() => document.querySelector(".listing-card")?.getAttribute("href"));
    await p.close();
    if (href) await probe(browser, href);
  } catch {}
  await browser.close();
})();
