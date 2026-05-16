// Image / logo stability probe.
//
// At 0ms / DCL / +100ms / +300ms / +1000ms samples for the following images:
//   * header logo
//   * first listing card image
//   * gallery first image (on listing detail pages)
//
// For each we capture: src, naturalWidth, naturalHeight, complete flag,
// rect (x,y,w,h), opacity, transform, transition. We then assert that the
// rect + opacity + transform stay identical from DCL onwards (the first
// visually-painted frame onwards). 0ms is intentionally informational only.

import { chromium } from "playwright";

const ROUTES = [
  "/",
  "/services",
  "/requests",
  "/marketplace",
  "/dashboard/settings",
  "/publish",
];

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function probeRoute(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const samples = [];

  const sample = async (label) => {
    const data = await page.evaluate(() => {
      const probe = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          src: el.getAttribute?.("src") || "",
          rect: `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`,
          natural: el.naturalWidth ? `${el.naturalWidth}x${el.naturalHeight}` : "—",
          complete: el.complete ?? false,
          opacity: cs.opacity,
          transform: cs.transform === "none" ? "—" : cs.transform,
          transition: cs.transitionProperty === "all" ? "ALL" : cs.transitionProperty,
        };
      };
      return {
        logo: probe(document.querySelector('header[data-ls="header"] img')),
        cardImg: probe(document.querySelector('.listing-card__image-wrapper img')),
        gallery: probe(document.querySelector('.listing-media__frame img')),
      };
    });
    samples.push({ label, ...data });
  };

  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      try { await sample("0ms"); } catch {}
    }
  });

  const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  const httpStatus = resp ? resp.status() : 0;
  await sample("DCL");
  await new Promise((r) => setTimeout(r, 100));
  await sample("+100");
  await new Promise((r) => setTimeout(r, 200));
  await sample("+300");
  await new Promise((r) => setTimeout(r, 700));
  await sample("+1000");

  await page.close();

  const visible = samples.filter((s) => s.label !== "0ms");
  const stable = (key) => {
    const present = visible.filter((s) => s[key]);
    if (present.length === 0) return "—";
    const ref = present[0][key];
    const drift = present.find((s) => {
      const v = s[key];
      return (
        v.rect !== ref.rect ||
        v.opacity !== ref.opacity ||
        v.transform !== ref.transform
      );
    });
    return drift ? `SHIFT@${drift.label} rect=${drift[key].rect} (ref=${ref.rect})` : "OK";
  };

  return {
    route,
    httpStatus,
    samples,
    logoStability: stable("logo"),
    cardImgStability: stable("cardImg"),
    galleryStability: stable("gallery"),
  };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const route of ROUTES) {
    const r = await probeRoute(browser, route);
    console.log(`\n=== ${route}  HTTP ${r.httpStatus} ===`);
    for (const s of r.samples) {
      const parts = [];
      for (const k of ["logo", "cardImg", "gallery"]) {
        if (!s[k]) { parts.push(`${k}=—`); continue; }
        parts.push(`${k}=${s[k].rect} op=${s[k].opacity} tr=${s[k].transform}`);
      }
      console.log(`  ${s.label.padEnd(6)} ${parts.join("  ")}`);
    }
    console.log(`  => logo:${r.logoStability}  card:${r.cardImgStability}  gallery:${r.galleryStability}`);
    results.push(r);
  }

  // Also probe a listing detail page if /services has any.
  try {
    const probe = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await probe.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
    const detailHref = await probe.evaluate(() => {
      const a = document.querySelector('.listing-card');
      return a ? a.getAttribute("href") : null;
    });
    await probe.close();
    if (detailHref) {
      const r = await probeRoute(browser, detailHref);
      console.log(`\n=== ${detailHref}  HTTP ${r.httpStatus} ===`);
      for (const s of r.samples) {
        const parts = [];
        for (const k of ["logo", "cardImg", "gallery"]) {
          if (!s[k]) { parts.push(`${k}=—`); continue; }
          parts.push(`${k}=${s[k].rect} op=${s[k].opacity} tr=${s[k].transform}`);
        }
        console.log(`  ${s.label.padEnd(6)} ${parts.join("  ")}`);
      }
      console.log(`  => logo:${r.logoStability}  card:${r.cardImgStability}  gallery:${r.galleryStability}`);
      results.push(r);
    }
  } catch (e) {
    console.log("(detail probe skipped:", e.message, ")");
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`${r.route.padEnd(50)} logo:${r.logoStability.padEnd(8)} card:${r.cardImgStability.padEnd(8)} gallery:${r.galleryStability}`);
  }

  await browser.close();
  process.exit(0);
})();
