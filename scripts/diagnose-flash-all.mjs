// scripts/diagnose-flash-all.mjs
// Full-site route transition stability audit.
// For each route, samples DOM at: 0ms (commit), DCL, +100, +300, +1000ms.
// Captures: body chars, h1 text, footerTop, main rect, hidden stream markers.
// Public routes only — auth-gated routes are tested as-they-render-when-logged-out
// (which is exactly what a fresh visitor sees).

import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const TIMING = [
  { label: "0ms     ", waitFor: "commit",           extraMs: 0 },
  { label: "DCL     ", waitFor: "domcontentloaded", extraMs: 0 },
  { label: "+100    ", waitFor: null,               extraMs: 100 },
  { label: "+300    ", waitFor: null,               extraMs: 200 }, // 100+200=300
  { label: "+1000   ", waitFor: null,               extraMs: 700 }, // 300+700=1000
];

const SNAP = `
(function () {
  const html = document.documentElement.outerHTML;
  const main = document.querySelector("main") || document.body;
  const footer = document.querySelector("footer");
  const h1 = document.querySelector("h1");
  // Detect implicit suspense streaming holes (the bug).
  const streamTemplates = (html.match(/<template id="[BFS]:/g) || []).length;
  const hiddenStreamDivs = (html.match(/<div hidden id="[BFS]:/g) || []).length;
  const rcCalls = (html.match(/\\$RC\\(/g) || []).length;
  // Hidden ancestor check on <main>
  function hiddenChain(el) {
    let cur = el;
    const flags = [];
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      if (cs.display === "none") flags.push("display:none");
      if (cs.visibility === "hidden") flags.push("visibility:hidden");
      if (parseFloat(cs.opacity) === 0) flags.push("opacity:0");
      if (cur.hasAttribute && cur.hasAttribute("hidden")) flags.push("hidden");
      cur = cur.parentElement;
    }
    return flags;
  }
  const mainRect = main ? main.getBoundingClientRect() : null;
  return {
    bodyChars: document.body.innerText.length,
    h1Text: h1 ? h1.innerText.slice(0, 50) : null,
    footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
    mainW: mainRect ? Math.round(mainRect.width) : null,
    mainH: mainRect ? Math.round(mainRect.height) : null,
    mainHidden: main ? hiddenChain(main).join(",") : "NO_MAIN",
    streamTemplates,
    hiddenStreamDivs,
    rcCalls,
    skeletonCount: document.querySelectorAll("[class*='skeleton'], [class*='Skeleton']").length,
  };
})()
`;

async function probeRoute(browser, route) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  let httpStatus = null;
  page.on("response", (res) => {
    if (res.url() === BASE + route && httpStatus === null) {
      httpStatus = res.status();
    }
  });
  try {
    await page.goto(BASE + route, { waitUntil: "commit", timeout: 15000 });
  } catch (e) {
    await ctx.close();
    return { route, error: e.message, httpStatus };
  }
  const samples = [];
  for (const t of TIMING) {
    if (t.waitFor === "domcontentloaded") {
      try { await page.waitForLoadState("domcontentloaded", { timeout: 5000 }); }
      catch { /* ignore */ }
    }
    if (t.extraMs > 0) await page.waitForTimeout(t.extraMs);
    const snap = await page.evaluate(SNAP).catch(() => null);
    samples.push({ label: t.label, ...(snap || {}) });
  }
  await ctx.close();
  return { route, httpStatus, samples };
}

function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }

function fmtSample(s) {
  return [
    s.label,
    `body=${pad(s.bodyChars ?? "?", 5)}`,
    `h1=${pad(`"${(s.h1Text || "").slice(0, 18)}"`, 22)}`,
    `main=${pad(`${s.mainW ?? "?"}x${s.mainH ?? "?"}`, 12)}`,
    `footerTop=${pad(s.footerTop ?? "?", 6)}`,
    `streams=${s.streamTemplates ?? "?"}`,
    `hiddenStream=${s.hiddenStreamDivs ?? "?"}`,
    `RC=${s.rcCalls ?? "?"}`,
    `skel=${s.skeletonCount ?? "?"}`,
    s.mainHidden ? `mainHidden=[${s.mainHidden}]` : "",
  ].filter(Boolean).join("  ");
}

function analyze(samples) {
  // s0 = 0ms, s1 = DCL, s4 = +1000
  const sDCL = samples[1] || {};
  const s1000 = samples[4] || {};
  const footerDelta = sDCL.footerTop !== null && s1000.footerTop !== null
    ? Math.abs(sDCL.footerTop - s1000.footerTop)
    : null;
  const bodyDelta = (s1000.bodyChars ?? 0) - (sDCL.bodyChars ?? 0);
  return {
    contentAtDCL: (sDCL.bodyChars ?? 0) > 100,
    footerDelta,
    bodyGrowthAfterDCL: bodyDelta,
    streamMarkers: Math.max(...samples.map(s => s.streamTemplates ?? 0)),
    hiddenStreamMax: Math.max(...samples.map(s => s.hiddenStreamDivs ?? 0)),
    rcMax: Math.max(...samples.map(s => s.rcCalls ?? 0)),
    skeletonMax: Math.max(...samples.map(s => s.skeletonCount ?? 0)),
    mainHiddenAtDCL: sDCL.mainHidden,
  };
}

const ROUTES = [
  "/",
  "/services",
  "/requests",
  "/marketplace",
  "/publish",
  "/login",
  "/signup",
  "/dashboard",
  "/dashboard/listings",
  "/dashboard/messages",
  "/dashboard/saved",
  "/dashboard/settings",
  "/messages",
  "/contact",
  "/safety",
  "/privacy-policy",
  "/terms-and-conditions",
  "/cookie-policy",
  "/report-listing",
];

(async () => {
  const browser = await chromium.launch();

  // Discover one listing detail URL.
  const discCtx = await browser.newContext();
  const discPage = await discCtx.newPage();
  await discPage.goto(BASE + "/services", { waitUntil: "domcontentloaded" });
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
  if (detailHref) ROUTES.push(detailHref);

  const all = [];
  for (const route of ROUTES) {
    console.log("\n" + "=".repeat(100));
    console.log(`ROUTE: ${route}`);
    console.log("=".repeat(100));
    const res = await probeRoute(browser, route);
    if (res.error) {
      console.log(`  ERROR: ${res.error}  (http=${res.httpStatus})`);
      all.push({ route, error: res.error, httpStatus: res.httpStatus });
      continue;
    }
    for (const s of res.samples) console.log("  " + fmtSample(s));
    const a = analyze(res.samples);
    console.log("  =>", JSON.stringify(a));
    all.push({ route, httpStatus: res.httpStatus, ...a });
  }

  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));
  const cols = ["route", "http", "contentAtDCL", "footerDelta", "bodyGrowth", "streams", "hidS", "RC", "skel", "mainHiddenAtDCL"];
  const widths = [44, 5, 13, 12, 12, 8, 5, 4, 5, 22];
  console.log(cols.map((c, i) => pad(c, widths[i])).join("  "));
  console.log(widths.map(w => "-".repeat(w)).join("  "));
  for (const r of all) {
    if (r.error) {
      console.log(pad(r.route, widths[0]) + "  " + pad(r.httpStatus, widths[1]) + "  ERROR " + r.error);
      continue;
    }
    const row = [
      pad(r.route, widths[0]),
      pad(r.httpStatus, widths[1]),
      pad(r.contentAtDCL, widths[2]),
      pad(r.footerDelta, widths[3]),
      pad(r.bodyGrowthAfterDCL, widths[4]),
      pad(r.streamMarkers, widths[5]),
      pad(r.hiddenStreamMax, widths[6]),
      pad(r.rcMax, widths[7]),
      pad(r.skeletonMax, widths[8]),
      pad(r.mainHiddenAtDCL || "", widths[9]),
    ];
    console.log(row.join("  "));
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
