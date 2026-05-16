import { chromium } from "playwright";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("http://localhost:3000/services", { waitUntil: "domcontentloaded" });
  const href = await p.evaluate(() => document.querySelector(".listing-card")?.getAttribute("href"));
  if (!href) { console.log("no detail"); process.exit(0); }
  await p.goto("http://localhost:3000" + href, { waitUntil: "domcontentloaded" });
  await p.waitForSelector(".listing-media img", { timeout: 10000 });
  const probe = async (label) => {
    const r = await p.evaluate(() => {
      const el = document.querySelector(".listing-media img");
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        rect: Math.round(r.x) + "," + Math.round(r.y) + "," + Math.round(r.width) + "x" + Math.round(r.height),
        op: cs.opacity,
        tr: cs.transform,
        transition: cs.transitionProperty,
      };
    });
    console.log(label.padEnd(8), JSON.stringify(r));
  };
  await probe("mount");
  await new Promise((r) => setTimeout(r, 100)); await probe("+100");
  await new Promise((r) => setTimeout(r, 200)); await probe("+300");
  await new Promise((r) => setTimeout(r, 700)); await probe("+1000");
  await b.close();
})();
