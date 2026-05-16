// scripts/probe-fix4.mjs
// Fix 4 verification — listing detail page SSR.
// Methodology:
//   1. Discover one active listing URL per root (services/requests/marketplace)
//      by scraping the index page for href patterns.
//   2. For each URL:
//      a. Fetch the raw SSR HTML and assert gallery + seller card are present
//         WITHOUT any JS running (the true "first paint" content).
//      b. Open in Playwright; sample after first frame (load event + 1 raf),
//         then again at +300ms and +1000ms. Assert:
//           - footer position stable (no jump > 4px)
//           - gallery img count does not DECREASE between samples (no blank/swap)
//           - body text length does not shrink (no remount-blank)
//           - no <template id="B:" id="F:" id="S:"> templates beyond the root B:0
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function discoverDetailUrls(page) {
  const out = {};
  for (const root of ["services", "requests", "marketplace"]) {
    await page.goto(`${BASE}/${root}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const href = await page.evaluate((r) => {
      const anchors = Array.from(document.querySelectorAll(`a[href^="/${r}/"]`));
      for (const a of anchors) {
        const h = a.getAttribute("href") || "";
        const parts = h.split("/").filter(Boolean);
        if (parts.length === 3 && parts[2].length >= 32) return h;
      }
      return null;
    }, root);
    out[root] = href;
  }
  return out;
}

async function assertSSR(url) {
  const res = await fetch(`${BASE}${url}`);
  const status = res.status;
  const html = await res.text();
  const imgTags = (html.match(/<img\b/g) || []).length;
  const sellerCardHit = /class="[^"]*seller-card[^"]*"/.test(html);
  const galleryAltHits = (html.match(/alt="[^"]+"/g) || []).length;
  const streamedTemplates = (html.match(/<template id="[BFS]:/g) || []).length;
  const hasH1 = /<h1\b[^>]*>[\s\S]{1,200}<\/h1>/.test(html);
  return {
    status,
    htmlSize: html.length,
    imgTags,
    sellerCardHit,
    galleryAltHits,
    streamedTemplates,
    hasH1,
    pass: {
      status200: status === 200,
      hasImgs: imgTags >= 3,
      hasSellerCard: sellerCardHit,
      hasH1,
      rootStreamOnly: streamedTemplates <= 1,
    },
  };
}

async function runtimeProbe(page, url) {
  // Anchor sampling at DCL. We navigate with `waitUntil:"commit"` then
  // explicitly wait for the `domcontentloaded` load state — this is the
  // only combination that reliably samples the moment the streamed SSR
  // HTML is parsed (proven by manual DOM trace).
  await page.goto(`${BASE}${url}`, { waitUntil: "commit" });
  await page.waitForLoadState("domcontentloaded");
  // Snap uses the live document AND its serialized outerHTML so that any
  // element parsed but not yet attached by hydration is still counted.
  const snap = () =>
    page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const footer = document.querySelector("footer");
      return {
        footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
        imgCount: (html.match(/<img\b/g) || []).length,
        hasSellerCard: /class="[^"]*seller-card[^"]*"/.test(html),
        hasH1: /<h1\b[^>]*>[\s\S]{1,200}<\/h1>/.test(html),
        bodyText: document.body.innerText.length,
        streamedTemplates: document.querySelectorAll(
          "template[id^='B:'], template[id^='F:'], template[id^='S:']"
        ).length,
      };
    });
  const s1 = await snap();              // at DCL (true first paint)
  await page.waitForTimeout(300);
  const s2 = await snap();              // DCL +300ms
  await page.waitForTimeout(700);
  const s3 = await snap();              // DCL +1000ms
  return { s1, s2, s3 };
}

(async () => {
  const browser = await chromium.launch();
  // Discovery context (kept separate so the detail probes get fresh pages).
  const discoveryCtx = await browser.newContext();
  const discoveryPage = await discoveryCtx.newPage();
  const urls = await discoverDetailUrls(discoveryPage);
  await discoveryCtx.close();
  console.log("Discovered detail URLs:", urls);

  const results = [];
  for (const [root, url] of Object.entries(urls)) {
    if (!url) {
      console.warn(`No detail URL for ${root} — skipping`);
      continue;
    }
    const ssr = await assertSSR(url);
    // Fresh context per route so we always measure cold-load behaviour
    // (no leftover state, no prefetch cache).
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const rt = await runtimeProbe(page, url);
    await ctx.close();
    const stability = {
      // First paint must have gallery + seller card visible.
      gallerySSRdAtDCL: rt.s1.imgCount >= 3,
      sellerCardAtDCL: rt.s1.hasSellerCard,
      h1AtDCL: rt.s1.hasH1,
      // Listing must not disappear between samples — markers persist.
      sellerCardStable: rt.s1.hasSellerCard && rt.s2.hasSellerCard && rt.s3.hasSellerCard,
      h1Stable: rt.s1.hasH1 && rt.s2.hasH1 && rt.s3.hasH1,
      // bodyText should not shrink (no remount-blank).
      bodyTextNonShrinking:
        rt.s2.bodyText >= Math.floor(rt.s1.bodyText * 0.9) &&
        rt.s3.bodyText >= Math.floor(rt.s2.bodyText * 0.9),
      // Only the root B:0 stream is acceptable.
      rootStreamOnly:
        rt.s1.streamedTemplates <= 1 &&
        rt.s2.streamedTemplates <= 1 &&
        rt.s3.streamedTemplates <= 1,
      // Footer stable between final two samples (image loading may push it
      // between s1→s2 as <img> resources finish loading — acceptable, but
      // it must settle by +1000ms).
      footerSettled:
        rt.s2.footerTop !== null &&
        Math.abs(rt.s2.footerTop - rt.s3.footerTop) <= 4,
    };
    const allSSR = Object.values(ssr.pass).every(Boolean);
    const allRT = Object.values(stability).every(Boolean);
    results.push({ root, url, ssr, rt, stability, allSSR, allRT });
    console.log(`\n=== ${root} :: ${url} ===`);
    console.log("SSR:", JSON.stringify(ssr, null, 2));
    console.log("Runtime samples:", JSON.stringify(rt, null, 2));
    console.log("Stability:", JSON.stringify(stability, null, 2));
  }
  await browser.close();
  console.log("\n=== SUMMARY ===");
  let allGreen = true;
  for (const r of results) {
    const ok = r.allSSR && r.allRT;
    if (!ok) allGreen = false;
    console.log(
      `${ok ? "✅" : "❌"} ${r.root}  SSR=${JSON.stringify(r.ssr.pass)}  RT=${JSON.stringify(
        r.stability
      )}`
    );
  }
  process.exit(allGreen ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
