// Paint-level diagnostic.
//
// For each route, captures at 0ms, DCL, +100ms, +300ms, +1000ms:
//   * complete / naturalWidth / currentSrc / srcset for header logo,
//     first listing card image, gallery main image (if present)
//   * resource timing for each image URL (transferSize, encodedBodySize,
//     duration, deliveryType: cache?, initiatorType)
//   * region screenshot of header logo and first 2 card images, pixel-
//     diffed against the +1000ms baseline. Reports the % of pixels that
//     differ.
//
// Run only on production build.

import { chromium } from "playwright";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "/tmp/findone-paint";
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = ["/services", "/requests", "/marketplace"];

function diffPng(aBuf, bBuf) {
  const a = PNG.sync.read(aBuf);
  const b = PNG.sync.read(bBuf);
  if (a.width !== b.width || a.height !== b.height) {
    return { differs: true, pct: 100, reason: "dim-mismatch" };
  }
  let diff = 0;
  const tol = 6; // per-channel tolerance to ignore antialias jitter
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (dr > tol || dg > tol || db > tol) diff++;
  }
  const total = a.width * a.height;
  return { differs: diff > 0, pct: (100 * diff) / total };
}

async function probeRoute(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Block the request log noise.
  const resources = [];
  page.on("requestfinished", async (req) => {
    const t = req.resourceType();
    if (t !== "image") return;
    const resp = await req.response().catch(() => null);
    const headers = resp ? await resp.allHeaders().catch(() => ({})) : {};
    resources.push({
      url: req.url(),
      method: req.method(),
      status: resp?.status() ?? 0,
      fromCache: resp?.fromServiceWorker?.() || headers["x-cache"] === "HIT",
      contentLength: Number(headers["content-length"] || 0),
      contentType: headers["content-type"] || "",
      timing: resp?.request?.()?.timing?.() ?? null,
    });
  });

  const sampleImg = async () =>
    page.evaluate(() => {
      const probe = (el) => {
        if (!el) return null;
        return {
          src: el.currentSrc || el.src,
          srcset: el.srcset || "",
          complete: el.complete,
          natural: el.naturalWidth ? `${el.naturalWidth}x${el.naturalHeight}` : "0",
          pictureSources:
            el.parentElement?.tagName === "PICTURE"
              ? Array.from(el.parentElement.querySelectorAll("source")).map((s) => s.srcset)
              : null,
        };
      };
      return {
        logo: probe(document.querySelector('header img')),
        card1: probe(document.querySelectorAll('.listing-card__image-wrapper img')[0]),
        card2: probe(document.querySelectorAll('.listing-card__image-wrapper img')[1]),
        gallery: probe(document.querySelector('.listing-media img')),
      };
    });

  const samples = [];
  const screenshots = {};
  const shot = async (label) => {
    // Snapshot logo + first 2 card image regions.
    const regions = await page.evaluate(() => {
      const r = (sel, i = 0) => {
        const el = document.querySelectorAll(sel)[i];
        if (!el) return null;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return null;
        return {
          x: Math.max(0, Math.round(b.x)),
          y: Math.max(0, Math.round(b.y)),
          w: Math.round(b.width),
          h: Math.round(b.height),
        };
      };
      return {
        logo: r("header img", 0),
        card1: r(".listing-card__image-wrapper", 0),
        card2: r(".listing-card__image-wrapper", 1),
      };
    });
    screenshots[label] = {};
    for (const [k, clip] of Object.entries(regions)) {
      if (!clip) continue;
      try {
        const buf = await page.screenshot({ clip, type: "png" });
        screenshots[label][k] = buf;
      } catch {}
    }
  };

  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  samples.push({ label: "DCL", ...(await sampleImg()) });
  await shot("DCL");
  await new Promise((r) => setTimeout(r, 100));
  samples.push({ label: "+100", ...(await sampleImg()) });
  await shot("+100");
  await new Promise((r) => setTimeout(r, 200));
  samples.push({ label: "+300", ...(await sampleImg()) });
  await shot("+300");
  await new Promise((r) => setTimeout(r, 700));
  samples.push({ label: "+1000", ...(await sampleImg()) });
  await shot("+1000");

  // Pixel-diff every earlier screenshot against +1000ms baseline.
  const diffs = {};
  for (const region of ["logo", "card1", "card2"]) {
    const base = screenshots["+1000"]?.[region];
    if (!base) continue;
    diffs[region] = {};
    for (const label of ["DCL", "+100", "+300"]) {
      const buf = screenshots[label]?.[region];
      if (!buf) { diffs[region][label] = "—"; continue; }
      const d = diffPng(buf, base);
      diffs[region][label] = d.pct.toFixed(2) + "%";
    }
  }

  await page.close();
  return { route, samples, resources, diffs };
}

(async () => {
  const browser = await chromium.launch();
  for (const route of ROUTES) {
    const r = await probeRoute(browser, route);
    console.log(`\n=== ${route} ===`);
    console.log("img state (DCL → +1000):");
    for (const s of r.samples) {
      const fmt = (x) => (x ? `complete=${x.complete} nw=${x.natural} src=${x.src.slice(-50)}` : "—");
      console.log(`  ${s.label.padEnd(6)} logo: ${fmt(s.logo)}`);
      console.log(`         card1:${fmt(s.card1)}`);
      console.log(`         gallery:${fmt(s.gallery)}`);
    }
    console.log("image resource timing:");
    for (const res of r.resources.slice(0, 8)) {
      const u = res.url.length > 80 ? "…" + res.url.slice(-78) : res.url;
      console.log(`  ${res.status} len=${res.contentLength} ${res.contentType.padEnd(12)} ${u}`);
    }
    console.log("pixel diff vs +1000ms baseline (% pixels changed):");
    for (const [region, byLabel] of Object.entries(r.diffs)) {
      console.log(`  ${region.padEnd(8)} DCL=${byLabel.DCL}  +100=${byLabel["+100"]}  +300=${byLabel["+300"]}`);
    }
  }

  // Also a listing detail page
  try {
    const p = await browser.newPage();
    await p.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
    const href = await p.evaluate(() => document.querySelector(".listing-card")?.getAttribute("href"));
    await p.close();
    if (href) {
      const r = await probeRoute(browser, href);
      console.log(`\n=== ${href} (detail) ===`);
      for (const s of r.samples) {
        const fmt = (x) => (x ? `complete=${x.complete} nw=${x.natural}` : "—");
        console.log(`  ${s.label.padEnd(6)} logo:${fmt(s.logo)}  gallery:${fmt(s.gallery)}`);
      }
      console.log("pixel diff vs +1000ms baseline:");
      for (const [region, byLabel] of Object.entries(r.diffs)) {
        console.log(`  ${region.padEnd(8)} DCL=${byLabel.DCL}  +100=${byLabel["+100"]}  +300=${byLabel["+300"]}`);
      }
    }
  } catch (e) {
    console.log("detail probe skipped:", e.message);
  }

  await browser.close();
})();
