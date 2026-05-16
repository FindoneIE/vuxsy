// Runtime probe for Fix 2 + Fix 3 verification (playwright).
import { chromium } from "playwright";

const ROUTES = ["/services", "/requests", "/marketplace"];
const BASE = "http://localhost:3000";

const SNAPSHOT_SCRIPT = `(() => {
  const container = document.querySelector('.listing-layout__content') || document.body;
  // Grid view: ListingCard uses .listing-card. List view: ListingsList uses
  // <Link> rows (no shared class), so we count direct <a href="/services/...">
  // / <a href="/requests/..."> / <a href="/marketplace/..."> children too.
  const gridCards = container.querySelectorAll('.listing-card');
  const listRows = container.querySelectorAll(
    'a[href^="/services/"], a[href^="/requests/"], a[href^="/marketplace/"]'
  );
  const itemCount = gridCards.length > 0 ? gridCards.length : listRows.length;
  const firstItem = (gridCards[0] || listRows[0]) || null;
  const rect = firstItem ? firstItem.getBoundingClientRect() : null;
  const gridWrap = firstItem ? firstItem.closest('[class*="grid-cols"]') : null;
  const footer = document.querySelector('footer');
  const skeleton = document.querySelector('[class*="skeleton"],[class*="animate-pulse"],[aria-busy="true"]');
  return {
    viewKind: gridCards.length > 0 ? 'grid' : (listRows.length > 0 ? 'list' : 'empty'),
    itemCount,
    firstRect: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
    gridWrapClass: gridWrap ? gridWrap.className.slice(0, 80) : null,
    footerOffsetTop: footer ? footer.offsetTop : null,
    hasSkeleton: !!skeleton,
  };
})()`;

async function probe(browser, route, cookieMode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (cookieMode) {
    await context.addCookies([
      { name: "listingViewMode", value: cookieMode, domain: "localhost", path: "/" },
    ]);
  }
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__swapCount = 0;
    window.__dclSnapshot = null;
    document.addEventListener("DOMContentLoaded", () => {
      const container = document.querySelector(".listing-layout__content") || document.body;
      const gridCards = container.querySelectorAll(".listing-card");
      const listRows = container.querySelectorAll(
        'a[href^="/services/"], a[href^="/requests/"], a[href^="/marketplace/"]'
      );
      const firstItem = gridCards[0] || listRows[0] || null;
      const rect = firstItem ? firstItem.getBoundingClientRect() : null;
      const gridWrap = firstItem ? firstItem.closest('[class*="grid-cols"]') : null;
      const footer = document.querySelector("footer");
      window.__dclSnapshot = {
        viewKind:
          gridCards.length > 0 ? "grid" : listRows.length > 0 ? "list" : "empty",
        itemCount: gridCards.length > 0 ? gridCards.length : listRows.length,
        firstRect: rect
          ? { w: Math.round(rect.width), h: Math.round(rect.height) }
          : null,
        gridWrapClass: gridWrap ? gridWrap.className.slice(0, 80) : null,
        footerOffsetTop: footer ? footer.offsetTop : null,
      };
      const obs = new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (
              n.matches &&
              (n.matches('[class*="grid-cols"]') || n.matches('[class*="listings-list"]'))
            ) {
              window.__swapCount++;
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  });
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  const dcl = await page.evaluate(() => window.__dclSnapshot);
  await page.waitForTimeout(300);
  const at300 = await page.evaluate(SNAPSHOT_SCRIPT);
  await page.waitForTimeout(700);
  const at1000 = await page.evaluate(SNAPSHOT_SCRIPT);
  const swapCount = await page.evaluate(() => window.__swapCount);
  await context.close();
  return { route, cookieMode: cookieMode || "(none -> grid)", dcl, at300, at1000, swapCount };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const route of ROUTES) {
    results.push(await probe(browser, route, null));
    results.push(await probe(browser, route, "list"));
  }
  await browser.close();
  for (const r of results) {
    const footerDelta =
      r.dcl?.footerOffsetTop != null && r.at1000?.footerOffsetTop != null
        ? r.at1000.footerOffsetTop - r.dcl.footerOffsetTop
        : null;
    const viewKindChanged = r.dcl?.viewKind !== r.at1000?.viewKind;
    const itemCountChanged = r.dcl?.itemCount !== r.at1000?.itemCount;
    console.log(
      `\n=== ${r.route} cookie=${r.cookieMode} ===\n` +
        `  DCL:    view=${r.dcl?.viewKind} items=${r.dcl?.itemCount} firstRect=${JSON.stringify(r.dcl?.firstRect)} footerTop=${r.dcl?.footerOffsetTop}\n` +
        `  +300:   view=${r.at300?.viewKind} items=${r.at300?.itemCount} firstRect=${JSON.stringify(r.at300?.firstRect)} footerTop=${r.at300?.footerOffsetTop}\n` +
        `  +1000:  view=${r.at1000?.viewKind} items=${r.at1000?.itemCount} firstRect=${JSON.stringify(r.at1000?.firstRect)} footerTop=${r.at1000?.footerOffsetTop}\n` +
        `  viewKindChangedDCL->+1000: ${viewKindChanged}\n` +
        `  itemCountChangedDCL->+1000: ${itemCountChanged}\n` +
        `  footerDelta(DCL->+1000): ${footerDelta}\n` +
        `  containerSwaps(post-DCL): ${r.swapCount}\n` +
        `  hasSkeleton@+1000: ${r.at1000?.hasSkeleton}`
    );
  }
})();
