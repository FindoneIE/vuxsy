// True first-frame trace.
//
// Uses CDP Page.startScreencast to capture every paint frame from navigation
// start, then pixel-diffs each consecutive frame against the final stable
// frame (last captured) AND against the next frame. Reports:
//   * the timestamp of the FIRST captured frame (= first paint)
//   * the timestamp of the LAST frame that still differed > 0.1% from final
//   * how many frames between first paint and stable
//   * per-region diff (logo, card1, card2, card3, gallery) at each frame
//
// This tells us whether a visible repaint happens between first paint and
// the final stable frame — which is what the human eye perceives as flash.

import { chromium } from "playwright";
import { PNG } from "pngjs";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ROUTES = process.argv.slice(2);
if (ROUTES.length === 0) ROUTES.push("/services", "/requests", "/marketplace");

const OUT = "/tmp/findone-frames";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function decode(b64) {
  return Buffer.from(b64, "base64");
}

function diffRegion(a, b, x, y, w, h) {
  // a, b: PNG decoded
  if (!a || !b) return 100;
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

  const frames = []; // { ms, buf }
  const tStart = Date.now();

  cdp.on("Page.screencastFrame", async (evt) => {
    frames.push({ ms: Date.now() - tStart, b64: evt.data });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: evt.sessionId }); } catch {}
  });

  await cdp.send("Page.enable");
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 1280, maxHeight: 900 });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Keep capturing for 1500ms to ensure we have the stable final frame.
  await new Promise((r) => setTimeout(r, 1500));
  await cdp.send("Page.stopScreencast");

  // Capture regions from settled DOM.
  const regions = await page.evaluate(() => {
    const grabVisible = (sel) => {
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect();
        if (b.width >= 2 && b.height >= 2) {
          return { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)), w: Math.floor(b.width), h: Math.floor(b.height) };
        }
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

  if (frames.length === 0) {
    console.log(`\n=== ${route} === NO FRAMES`);
    return;
  }

  // Decode all frames.
  const decoded = frames.map((f) => {
    try { return { ms: f.ms, png: PNG.sync.read(decode(f.b64)), buf: decode(f.b64) }; }
    catch { return null; }
  }).filter(Boolean);

  // Save first 6 frames + last to /tmp for visual inspection.
  const safe = route.replace(/[^a-z0-9]/gi, "_");
  const toSave = [...decoded.slice(0, 6), decoded[decoded.length - 1]];
  for (let i = 0; i < toSave.length; i++) {
    fs.writeFileSync(`${OUT}/${safe}_${String(i).padStart(2, "0")}_${toSave[i].ms}ms.png`, toSave[i].buf);
  }

  const final = decoded[decoded.length - 1].png;
  // Per-region diff per frame.
  const ROWS = [];
  for (const f of decoded) {
    const row = { ms: f.ms };
    for (const [name, r] of Object.entries(regions)) {
      if (!r) { row[name] = "—"; continue; }
      const pct = diffRegion(f.png, final, r.x, r.y, r.w, r.h);
      row[name] = pct;
    }
    ROWS.push(row);
  }

  console.log(`\n=== ${route} ===`);
  console.log(`captured ${decoded.length} frames over ${decoded[decoded.length - 1].ms}ms`);
  console.log(`regions: ${JSON.stringify(regions)}`);
  console.log(`frame timestamps: [${decoded.slice(0, 12).map((f) => f.ms).join(", ")}${decoded.length > 12 ? ", …, " + decoded[decoded.length - 1].ms : ""}]`);
  console.log();
  // Find first-stable per region: the earliest frame whose diff to final is < 0.5%
  const STABLE = 0.5;
  const cols = Object.keys(regions).filter((k) => regions[k]);
  console.log(`first-stable (diff < ${STABLE}% vs final frame):`);
  for (const c of cols) {
    const idx = ROWS.findIndex((r) => typeof r[c] === "number" && r[c] < STABLE);
    if (idx < 0) {
      console.log(`  ${c.padEnd(8)} NEVER STABLE (final diff = ${ROWS[ROWS.length - 1][c]})`);
    } else {
      console.log(`  ${c.padEnd(8)} stable from frame ${idx} @ ${ROWS[idx].ms}ms (diff ${ROWS[idx][c].toFixed(2)}%)`);
    }
  }
  // Print first 8 frames detail.
  console.log();
  console.log(`per-frame diff vs final frame (first 12 frames):`);
  console.log(`  frame  ms    ${cols.map((c) => c.padEnd(8)).join("  ")}`);
  for (let i = 0; i < Math.min(12, ROWS.length); i++) {
    const r = ROWS[i];
    const cells = cols.map((c) => (typeof r[c] === "number" ? r[c].toFixed(2).padStart(6) + "%" : "    —  "));
    console.log(`  ${String(i).padStart(5)}  ${String(r.ms).padStart(4)}  ${cells.join("  ")}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const r of ROUTES) {
    await probe(browser, r);
  }
  // detail
  try {
    const p = await browser.newPage();
    await p.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
    const href = await p.evaluate(() => document.querySelector(".listing-card")?.getAttribute("href"));
    await p.close();
    if (href) await probe(browser, href);
  } catch {}
  await browser.close();
  console.log(`\nframes saved under ${OUT}/`);
})();
