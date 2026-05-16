// scripts/diagnose-flash.mjs
// DIAGNOSIS-ONLY. Captures visible-state lifecycle of all 4 problem areas:
//   1. /services
//   2. /requests
//   3. /marketplace
//   4. /services/<cat>/<id>     (detail page — ListingGallery + SellerCard)
//
// For each area, sample at: 0ms (commit), DCL, DCL+100, DCL+300, DCL+1000
//
// Per sample we capture:
//   - bodySize          (innerText length, sanity)
//   - footerTop         (px from viewport top)
//   - container rect    (the listings grid / detail layout root)
//   - cardCount         (visible cards w/ nonzero size)
//   - firstCardRect     (w,h,top)
//   - firstCardImgState (complete, naturalWidth, currentSrc tail)
//   - galleryImgCount   (detail)
//   - sellerCardRect    (detail)
//   - h1Text            (detail)
//   - hiddenStreamCount (template id^=B:|F:|S:)
//   - skeletonCount     (any element matching skeleton/placeholder class)
//   - hiddenAncestors   (count of ancestors w/ display:none / visibility:hidden / opacity:0 within the listings container)
//
// We also install a MutationObserver BEFORE first paint and dump a summary
// of mutations: which nodes were added/removed/attribute-changed between
// 0ms and +1000ms, focused on the listings container subtree.
//
// Fresh context per route — no shared state. Cold load only.

import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const TIMING = [
  { label: "0ms      ", waitFor: "commit",            extraMs: 0 },
  { label: "DCL      ", waitFor: "domcontentloaded",  extraMs: 0 },
  { label: "DCL+100  ", waitFor: null,                extraMs: 100 },
  { label: "DCL+300  ", waitFor: null,                extraMs: 200 }, // +100+200 = 300 total from DCL
  { label: "DCL+1000 ", waitFor: null,                extraMs: 700 }, // 300+700 = 1000
];

// Probe payload — runs inside the page.
const INSTRUMENT = `
(function () {
  if (window.__diag) return;
  const log = [];
  window.__diag = { log, mutations: [] };
  // Install MutationObserver as early as possible.
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      const target = m.target;
      const path = (() => {
        try {
          let el = target.nodeType === 1 ? target : target.parentElement;
          const parts = [];
          let depth = 0;
          while (el && depth < 6) {
            const tag = el.tagName ? el.tagName.toLowerCase() : '#text';
            const id = el.id ? '#' + el.id : '';
            const cls = el.className && typeof el.className === 'string'
              ? '.' + el.className.split(/\\s+/).slice(0, 2).join('.')
              : '';
            parts.push(tag + id + cls);
            el = el.parentElement;
            depth++;
          }
          return parts.join(' < ');
        } catch { return '?'; }
      })();
      window.__diag.mutations.push({
        t: performance.now(),
        type: m.type,
        added: m.addedNodes.length,
        removed: m.removedNodes.length,
        attr: m.attributeName || null,
        path,
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','data-loaded','data-hydrated','hidden','aria-hidden'] });
  window.__diag.mo = mo;
})();
`;

// Snapshot script for index pages.
const SNAP_INDEX = `
(function () {
  const body = document.body;
  const footer = document.querySelector('footer');
  // Try a few common selectors for the listings container.
  const containers = [
    '[data-listings-container]',
    '[data-listings-grid]',
    '[class*="listings-grid"]',
    '[class*="ListingsGrid"]',
    '[class*="card-grid"]',
    'main [class*="grid"]',
    'main',
  ];
  let container = null, containerSel = null;
  for (const s of containers) {
    const el = document.querySelector(s);
    if (el) { container = el; containerSel = s; break; }
  }
  const containerRect = container ? container.getBoundingClientRect() : null;
  // Cards: anchor links inside the container leading to /services|requests|marketplace/<cat>/<id>
  const cardAnchors = container
    ? Array.from(container.querySelectorAll('a[href]'))
        .filter(a => /^\\/(services|requests|marketplace)\\/[^/]+\\/[^/]+/.test(a.getAttribute('href') || ''))
    : [];
  // Filter to visible-ish (rect h>20) so we count "cards" not nav links.
  const visibleCards = cardAnchors.filter(a => {
    const r = a.getBoundingClientRect();
    return r.width > 20 && r.height > 20;
  });
  const firstCard = visibleCards[0] || null;
  const firstCardRect = firstCard ? firstCard.getBoundingClientRect() : null;
  const firstImg = firstCard ? firstCard.querySelector('img') : null;
  const firstImgState = firstImg ? {
    complete: firstImg.complete,
    nw: firstImg.naturalWidth,
    nh: firstImg.naturalHeight,
    src: (firstImg.currentSrc || firstImg.src || '').slice(-80),
    rect: (() => { const r = firstImg.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  } : null;
  // Hidden ancestor check for the container itself
  function hiddenChain(el) {
    let cur = el;
    const flags = [];
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      if (cs.display === 'none') flags.push('display:none@' + cur.tagName);
      if (cs.visibility === 'hidden') flags.push('visibility:hidden@' + cur.tagName);
      if (parseFloat(cs.opacity) === 0) flags.push('opacity:0@' + cur.tagName);
      if (cur.hasAttribute && cur.hasAttribute('hidden')) flags.push('hidden@' + cur.tagName);
      cur = cur.parentElement;
    }
    return flags;
  }
  return {
    bodyChars: body.innerText.length,
    footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
    containerSel,
    containerRect: containerRect ? {
      w: Math.round(containerRect.width),
      h: Math.round(containerRect.height),
      top: Math.round(containerRect.top),
    } : null,
    containerHidden: container ? hiddenChain(container) : ['NO_CONTAINER'],
    cardCount: visibleCards.length,
    cardCountTotalAnchors: cardAnchors.length,
    firstCardRect: firstCardRect ? {
      w: Math.round(firstCardRect.width),
      h: Math.round(firstCardRect.height),
      top: Math.round(firstCardRect.top),
    } : null,
    firstImgState,
    streamTemplates: document.querySelectorAll("template[id^='B:'], template[id^='F:'], template[id^='S:']").length,
    skeletonCount: document.querySelectorAll("[class*='skeleton'], [class*='Skeleton']").length,
  };
})()
`;

// Snapshot script for the detail page.
const SNAP_DETAIL = `
(function () {
  const body = document.body;
  const footer = document.querySelector('footer');
  const h1 = document.querySelector('h1');
  // Gallery: try several selectors
  const gallerySel = [
    '[data-listing-gallery]',
    '[class*="listing-gallery"]',
    '[class*="ListingGallery"]',
    '[class*="gallery"]',
  ];
  let gallery = null, gallerySelHit = null;
  for (const s of gallerySel) {
    const el = document.querySelector(s);
    if (el) { gallery = el; gallerySelHit = s; break; }
  }
  const galleryRect = gallery ? gallery.getBoundingClientRect() : null;
  const galleryImgs = gallery ? Array.from(gallery.querySelectorAll('img')) : [];
  const firstGalleryImg = galleryImgs[0] || null;
  const firstGalleryImgState = firstGalleryImg ? {
    complete: firstGalleryImg.complete,
    nw: firstGalleryImg.naturalWidth,
    nh: firstGalleryImg.naturalHeight,
    src: (firstGalleryImg.currentSrc || firstGalleryImg.src || '').slice(-80),
  } : null;
  const sellerCard = document.querySelector("[class*='seller-card']");
  const sellerCardRect = sellerCard ? sellerCard.getBoundingClientRect() : null;
  function hiddenChain(el) {
    let cur = el;
    const flags = [];
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      if (cs.display === 'none') flags.push('display:none@' + cur.tagName);
      if (cs.visibility === 'hidden') flags.push('visibility:hidden@' + cur.tagName);
      if (parseFloat(cs.opacity) === 0) flags.push('opacity:0@' + cur.tagName);
      if (cur.hasAttribute && cur.hasAttribute('hidden')) flags.push('hidden@' + cur.tagName);
      cur = cur.parentElement;
    }
    return flags;
  }
  return {
    bodyChars: body.innerText.length,
    footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
    h1Text: h1 ? h1.innerText.slice(0, 60) : null,
    gallerySelHit,
    galleryRect: galleryRect ? {
      w: Math.round(galleryRect.width),
      h: Math.round(galleryRect.height),
      top: Math.round(galleryRect.top),
    } : null,
    galleryHidden: gallery ? hiddenChain(gallery) : ['NO_GALLERY'],
    galleryImgCount: galleryImgs.length,
    firstGalleryImgState,
    sellerCardRect: sellerCardRect ? {
      w: Math.round(sellerCardRect.width),
      h: Math.round(sellerCardRect.height),
      top: Math.round(sellerCardRect.top),
    } : null,
    sellerCardHidden: sellerCard ? hiddenChain(sellerCard) : ['NO_SELLER_CARD'],
    streamTemplates: document.querySelectorAll("template[id^='B:'], template[id^='F:'], template[id^='S:']").length,
    skeletonCount: document.querySelectorAll("[class*='skeleton'], [class*='Skeleton']").length,
  };
})()
`;

async function probeRoute(browser, route, kind) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  // Install instrumentation before any document script runs.
  await page.addInitScript(INSTRUMENT);
  await page.goto(`${BASE}${route}`, { waitUntil: "commit" });
  const samples = [];
  const SNAP = kind === "detail" ? SNAP_DETAIL : SNAP_INDEX;
  for (const t of TIMING) {
    if (t.waitFor === "domcontentloaded") {
      await page.waitForLoadState("domcontentloaded");
    }
    if (t.extraMs > 0) {
      await page.waitForTimeout(t.extraMs);
    }
    const snap = await page.evaluate(SNAP);
    samples.push({ label: t.label, ...snap });
  }
  // Dump mutation summary (collapsed by target path).
  const mutationSummary = await page.evaluate(() => {
    const buckets = new Map();
    for (const m of window.__diag.mutations) {
      const key = m.type + " " + (m.attr || "") + " :: " + m.path;
      const e = buckets.get(key) || { count: 0, firstT: m.t, lastT: m.t, sample: m };
      e.count++;
      e.lastT = m.t;
      buckets.set(key, e);
    }
    return Array.from(buckets.entries())
      .map(([k, v]) => ({ key: k, count: v.count, firstT: Math.round(v.firstT), lastT: Math.round(v.lastT) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  });
  await ctx.close();
  return { route, samples, mutationSummary };
}

function fmtIndex(s) {
  return [
    s.label,
    `body=${s.bodyChars}`,
    `cards=${s.cardCount}(${s.cardCountTotalAnchors}anch)`,
    `container=${s.containerSel || "?"} ${s.containerRect ? `${s.containerRect.w}x${s.containerRect.h}@${s.containerRect.top}` : "null"}`,
    `firstCard=${s.firstCardRect ? `${s.firstCardRect.w}x${s.firstCardRect.h}@${s.firstCardRect.top}` : "null"}`,
    `img=${s.firstImgState ? `${s.firstImgState.nw}x${s.firstImgState.nh}/c=${s.firstImgState.complete}` : "null"}`,
    `footerTop=${s.footerTop}`,
    `streams=${s.streamTemplates}`,
    `skel=${s.skeletonCount}`,
    s.containerHidden && s.containerHidden.length ? `hidden=[${s.containerHidden.join(",")}]` : "",
  ].filter(Boolean).join("  ");
}

function fmtDetail(s) {
  return [
    s.label,
    `body=${s.bodyChars}`,
    `h1="${(s.h1Text || "").slice(0, 24)}"`,
    `gallery=${s.gallerySelHit || "?"} ${s.galleryRect ? `${s.galleryRect.w}x${s.galleryRect.h}@${s.galleryRect.top}` : "null"} imgs=${s.galleryImgCount}`,
    `firstGalleryImg=${s.firstGalleryImgState ? `${s.firstGalleryImgState.nw}x${s.firstGalleryImgState.nh}/c=${s.firstGalleryImgState.complete}` : "null"}`,
    `sellerCard=${s.sellerCardRect ? `${s.sellerCardRect.w}x${s.sellerCardRect.h}@${s.sellerCardRect.top}` : "null"}`,
    `footerTop=${s.footerTop}`,
    `streams=${s.streamTemplates}`,
    `skel=${s.skeletonCount}`,
    s.galleryHidden && s.galleryHidden.length ? `gHidden=[${s.galleryHidden.join(",")}]` : "",
    s.sellerCardHidden && s.sellerCardHidden.length ? `sHidden=[${s.sellerCardHidden.join(",")}]` : "",
  ].filter(Boolean).join("  ");
}

(async () => {
  const browser = await chromium.launch();

  // Discover a real detail URL once (using its own context so no leakage).
  const discCtx = await browser.newContext();
  const discPage = await discCtx.newPage();
  await discPage.goto(`${BASE}/services`, { waitUntil: "domcontentloaded" });
  await discPage.waitForTimeout(800);
  const detailHref = await discPage.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/services/"]'));
    for (const a of anchors) {
      const h = a.getAttribute("href") || "";
      const parts = h.split("/").filter(Boolean);
      if (parts.length === 3 && parts[2].length >= 32) return h;
    }
    return null;
  });
  await discCtx.close();

  const routes = [
    { route: "/services", kind: "index" },
    { route: "/requests", kind: "index" },
    { route: "/marketplace", kind: "index" },
    { route: detailHref, kind: "detail" },
  ];

  for (const r of routes) {
    if (!r.route) { console.log(`SKIP ${r.kind} — no URL`); continue; }
    console.log("\n" + "=".repeat(96));
    console.log(`AREA: ${r.route}  (${r.kind})`);
    console.log("=".repeat(96));
    const result = await probeRoute(browser, r.route, r.kind);
    for (const s of result.samples) {
      console.log(r.kind === "detail" ? fmtDetail(s) : fmtIndex(s));
    }
    console.log("\nTop 20 mutations (collapsed by node path):");
    for (const m of result.mutationSummary.slice(0, 20)) {
      console.log(`  x${String(m.count).padStart(4)}  t=${m.firstT}→${m.lastT}ms  ${m.key}`);
    }
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
