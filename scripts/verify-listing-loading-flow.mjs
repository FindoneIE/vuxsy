import { chromium } from "playwright";

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const ROUTES = ["/services", "/requests", "/marketplace"];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

await context.addInitScript(() => {
  window.__lsProbe = { cls: 0 };
  if ("PerformanceObserver" in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__lsProbe.cls += entry.value;
        }
      }
    });
    try {
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      // ignore
    }
  }
});

function round(value) {
  if (typeof value !== "number") return value;
  return Math.round(value * 1000) / 1000;
}

async function snapshot(page, label) {
  return page.evaluate((currentLabel) => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    const firstContent = document.querySelector(
      ".hero, .listing-layout__content, .listings-grid, .listings-list, h1"
    );

    return {
      label: currentLabel,
      route: location.pathname,
      bodyScrollHeight: document.body?.scrollHeight ?? null,
      mainOffsetHeight: main instanceof HTMLElement ? main.offsetHeight : null,
      footerOffsetTop: footer instanceof HTMLElement ? footer.offsetTop : null,
      scrollY: window.scrollY,
      footerTopInViewport:
        footer instanceof HTMLElement ? footer.getBoundingClientRect().top : null,
      firstContentTag: firstContent?.tagName ?? null,
      firstContentClass:
        firstContent instanceof HTMLElement ? firstContent.className : null,
      firstContentText: firstContent?.textContent?.slice(0, 80) ?? null,
      cls: window.__lsProbe?.cls ?? null,
    };
  }, label);
}

const page = await context.newPage();
const report = {
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  hardReload: null,
  routeSwitches: [],
};

await page.goto(`${BASE_URL}/services`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  if (window.__lsProbe) window.__lsProbe.cls = 0;
});
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(150);

const beforeReload = await snapshot(page, "before-reload-at-footer");
await page.reload({ waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  if (window.__lsProbe) window.__lsProbe.cls = 0;
});
const afterReloadImmediate = await snapshot(page, "after-reload-immediate");
await page.waitForTimeout(450);
const afterReloadSettled = await snapshot(page, "after-reload-settled");

report.hardReload = {
  beforeReload,
  afterReloadImmediate,
  afterReloadSettled,
  footerOffsetDelta: round(
    (afterReloadSettled.footerOffsetTop ?? 0) - (afterReloadImmediate.footerOffsetTop ?? 0)
  ),
  mainOffsetDelta: round(
    (afterReloadSettled.mainOffsetHeight ?? 0) - (afterReloadImmediate.mainOffsetHeight ?? 0)
  ),
  clsAfterReload: round(afterReloadSettled.cls ?? 0),
};

for (const route of ROUTES) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    if (window.__lsProbe) window.__lsProbe.cls = 0;
  });
  const immediate = await snapshot(page, `switch-${route}-immediate`);
  await page.waitForTimeout(500);
  const settled = await snapshot(page, `switch-${route}-settled`);

  report.routeSwitches.push({
    route,
    immediate,
    settled,
    footerOffsetDelta: round((settled.footerOffsetTop ?? 0) - (immediate.footerOffsetTop ?? 0)),
    mainOffsetDelta: round((settled.mainOffsetHeight ?? 0) - (immediate.mainOffsetHeight ?? 0)),
    clsAtSettled: round(settled.cls ?? 0),
  });
}

await context.close();
await browser.close();

console.log(JSON.stringify(report, null, 2));
