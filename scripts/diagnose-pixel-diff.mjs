import { chromium } from "playwright";
import { PNG } from "pngjs";

const BASE = "http://localhost:3000";

function pixelDiff(a, b) {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  if (pa.width !== pb.width || pa.height !== pb.height) {
    return { differs: true, pct: 100, w: pa.width, h: pa.height };
  }
  let d = 0;
  const tol = 6;
  for (let i = 0; i < pa.data.length; i += 4) {
    if (
      Math.abs(pa.data[i] - pb.data[i]) > tol ||
      Math.abs(pa.data[i + 1] - pb.data[i + 1]) > tol ||
      Math.abs(pa.data[i + 2] - pb.data[i + 2]) > tol
    ) d++;
  }
  return { differs: d > 0, pct: (100 * d) / (pa.width * pa.height), w: pa.width, h: pa.height };
}

async function probe(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });

  const captureRegions = async () => {
    const regions = await page.evaluate(() => {
      const grabVisible = (sel) => {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const b = el.getBoundingClientRect();
          if (b.width >= 2 && b.height >= 2) {
            return {
              x: Math.max(0, Math.floor(b.x)),
              y: Math.max(0, Math.floor(b.y)),
              width: Math.min(1280, Math.floor(b.width)),
              height: Math.min(900, Math.floor(b.height)),
            };
          }
        }
        return null;
      };
      const grabIdx = (sel, i) => {
        const el = document.querySelectorAll(sel)[i];
        if (!el) return null;
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) return null;
        return {
          x: Math.max(0, Math.floor(b.x)),
          y: Math.max(0, Math.floor(b.y)),
          width: Math.min(1280, Math.floor(b.width)),
          height: Math.min(900, Math.floor(b.height)),
        };
      };
      return {
        logo: grabVisible("header img"),
        card1: grabIdx(".listing-card__image-wrapper", 0),
        card2: grabIdx(".listing-card__image-wrapper", 1),
        card3: grabIdx(".listing-card__image-wrapper", 2),
        gallery: grabVisible(".listing-media img"),
      };
    });
    const out = {};
    for (const [k, clip] of Object.entries(regions)) {
      if (!clip) continue;
      try {
        out[k] = await page.screenshot({ clip, type: "png" });
      } catch (e) {
        out[k] = null;
      }
    }
    return out;
  };

  const shots = {};
  shots.DCL = await captureRegions();
  await new Promise((r) => setTimeout(r, 100));
  shots["+100"] = await captureRegions();
  await new Promise((r) => setTimeout(r, 200));
  shots["+300"] = await captureRegions();
  await new Promise((r) => setTimeout(r, 700));
  shots["+1000"] = await captureRegions();

  await page.close();

  console.log(`\n=== ${route} ===`);
  console.log("region   DCL→+1000           +100→+1000          +300→+1000");
  for (const region of ["logo", "card1", "card2", "card3", "gallery"]) {
    const base = shots["+1000"][region];
    if (!base) { console.log(`${region.padEnd(8)} no baseline`); continue; }
    const row = [region.padEnd(8)];
    for (const label of ["DCL", "+100", "+300"]) {
      const cur = shots[label][region];
      if (!cur) { row.push("missing".padEnd(20)); continue; }
      const d = pixelDiff(cur, base);
      const sign = d.pct === 0 ? "✓" : d.pct < 0.5 ? "≈" : "✗";
      row.push(`${sign} ${d.pct.toFixed(2)}% (${d.w}x${d.h})`.padEnd(20));
    }
    console.log(row.join("   "));
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const r of ["/services", "/requests", "/marketplace"]) {
    await probe(browser, r);
  }
  // detail
  const p = await browser.newPage();
  await p.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
  const href = await p.evaluate(() => document.querySelector(".listing-card")?.getAttribute("href"));
  await p.close();
  if (href) await probe(browser, href);
  await browser.close();
})();
