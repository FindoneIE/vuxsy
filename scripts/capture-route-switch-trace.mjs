import { chromium } from "playwright";

const BASE_URL = process.env.TRACE_BASE_URL || "http://localhost:3000";
const ROUTES = ["/", "/services", "/requests", "/marketplace"];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const t0 = Date.now();
const events = [];

function relMs() {
  return Date.now() - t0;
}

page.on("console", (msg) => {
  const text = msg.text();
  if (!text.includes("[mount-trace]") && !text.includes("[listing-probe]")) return;
  events.push({
    atMs: relMs(),
    type: "browser-console",
    level: msg.type(),
    url: page.url(),
    text,
  });
});

for (const route of ROUTES) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });

  events.push({
    atMs: relMs(),
    type: "nav",
    route,
    note: "domcontentloaded",
  });

  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    const firstVisible = document.querySelector(
      '[data-ls="page-shell"] h1, .hero, .listing-layout__content, .listings-grid, .listings-list, .listing-card'
    );

    return {
      route: location.pathname,
      bodyScrollHeight: document.body?.scrollHeight ?? null,
      mainOffsetHeight: main instanceof HTMLElement ? main.offsetHeight : null,
      footerOffsetTop: footer instanceof HTMLElement ? footer.offsetTop : null,
      scrollY: window.scrollY,
      firstVisibleTag: firstVisible?.tagName ?? null,
      firstVisibleClass: firstVisible instanceof HTMLElement ? firstVisible.className : null,
      firstVisibleText: firstVisible?.textContent?.slice(0, 80) ?? null,
    };
  });

  events.push({
    atMs: relMs(),
    type: "dom-snapshot",
    ...metrics,
  });
}

await context.close();
await browser.close();

console.log(JSON.stringify({ baseUrl: BASE_URL, generatedAt: new Date().toISOString(), events }, null, 2));
