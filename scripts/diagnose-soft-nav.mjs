// Soft-navigation flash trace.
//
// Starts on /services, then clicks a category/marketplace link to test
// the CLIENT-side route transition. Captures every screencast frame.
// Reports any frame where the image regions differ from the post-
// transition stable state.

import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/findone-soft-nav";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);

  await page.goto(BASE + "/services", { waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 500));

  // Start screencast just before the click.
  const frames = [];
  const tStart = Date.now();
  cdp.on("Page.screencastFrame", async (evt) => {
    frames.push({ ms: Date.now() - tStart, buf: Buffer.from(evt.data, "base64") });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: evt.sessionId }); } catch {}
  });
  await cdp.send("Page.enable");
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1, maxWidth: 1280, maxHeight: 900 });

  // Click first nav link to /requests.
  await page.click('a[href="/requests"]', { timeout: 5000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await cdp.send("Page.stopScreencast");

  console.log(`captured ${frames.length} frames over ${frames.length ? frames[frames.length - 1].ms : 0}ms`);
  console.log("frame timeline (ms):", frames.map((f) => f.ms).join(", "));

  // Save first 10 frames + last.
  const toSave = [...frames.slice(0, 10), frames[frames.length - 1]];
  for (let i = 0; i < toSave.length; i++) {
    fs.writeFileSync(`${OUT}/${String(i).padStart(2, "0")}_${toSave[i].ms}ms.jpg`, toSave[i].buf);
  }

  // Decode all to RGB.
  const decoded = [];
  for (const f of frames) {
    const r = await sharp(f.buf).raw().toBuffer({ resolveWithObject: true });
    decoded.push({ ms: f.ms, data: r.data, info: r.info });
  }

  // Get regions from final state.
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
    };
  });
  console.log("regions:", regions);

  const final = decoded[decoded.length - 1];
  function diff(a, b, x, y, w, h) {
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

  console.log("\nper-frame diff vs final frame:");
  console.log("ms     logo    card1    card2    card3");
  for (const f of decoded) {
    const cells = Object.entries(regions).map(([, r]) => r ? diff(f, final, r.x, r.y, r.w, r.h).toFixed(2).padStart(6) + "%" : "    —  ").join(" ");
    console.log(`${String(f.ms).padStart(4)}  ${cells}`);
  }

  await browser.close();
})();
