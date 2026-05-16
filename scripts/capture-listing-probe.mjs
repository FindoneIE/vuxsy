import { chromium } from "playwright";

const BASE_URL = process.env.PROBE_BASE_URL || "http://localhost:3000";
const ROUTES = ["/services", "/requests", "/marketplace"];

function parseProbeMessage(msg) {
  const text = msg.text();
  if (!text.includes("[listing-probe]")) return null;
  const args = msg.args();
  if (args.length < 2) return null;
  return args[1].jsonValue();
}

function summarizeRoute(route, samples) {
  const ordered = samples.filter((s) => typeof s?.footerOffsetTop === "number");

  let largest = null;
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
    const delta = curr.footerOffsetTop - prev.footerOffsetTop;
    const absDelta = Math.abs(delta);

    if (!largest || absDelta > largest.absDelta) {
      largest = {
        fromPhase: prev.phase,
        toPhase: curr.phase,
        fromFooterOffsetTop: prev.footerOffsetTop,
        toFooterOffsetTop: curr.footerOffsetTop,
        delta,
        absDelta,
        source: curr.source ?? null,
      };
    }
  }

  return {
    route,
    sampleCount: ordered.length,
    phases: ordered.map((s) => ({
      phase: s.phase,
      footerOffsetTop: s.footerOffsetTop,
      source: s.source ?? null,
      listingsLength: s.listingsLength ?? null,
      promotedLength: s.promotedLength ?? null,
      bodyScrollHeight: s.bodyScrollHeight ?? null,
      mainOffsetHeight: s.mainOffsetHeight ?? null,
      listingsContainerOffsetHeight: s.listingsContainerOffsetHeight ?? null,
      scrollY: s.scrollY ?? null,
    })),
    largestDelta: largest,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

const summaries = [];

for (const route of ROUTES) {
  const page = await context.newPage();
  const samples = [];

  page.on("console", async (msg) => {
    try {
      const sample = await parseProbeMessage(msg);
      if (sample) samples.push(sample);
    } catch {
      // ignore probe parse errors
    }
  });

  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  summaries.push(summarizeRoute(route, samples));
  await page.close();
}

await browser.close();

const routeLargest = summaries
  .filter((summary) => summary.largestDelta)
  .map((summary) => ({ route: summary.route, ...summary.largestDelta }))
  .sort((a, b) => b.absDelta - a.absDelta);

const overallLargest = routeLargest[0] ?? null;

console.log(JSON.stringify({
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  summaries,
  overallLargest,
}, null, 2));
