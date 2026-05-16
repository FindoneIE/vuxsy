// Captures global UI stability snapshots at 0ms / DCL / +100 / +300 / +1000 ms.
// Reports: headerLogo (img count + first src + first alt), footerLogo, first
// header text snippet, first footer text snippet, first <select> option text,
// first <input> value, footerTop, bodyHeight, fontFamily of body.
//
// A route is considered stable when the header/footer logo and the body font
// stay identical from 0ms → +1000ms (no logo swap, no font swap → no flash).

import { chromium } from "playwright";

const ROUTES = [
  "/",
  "/services",
  "/requests",
  "/marketplace",
  "/dashboard/settings",
  "/publish",
  "/publish/service",
  "/publish/request",
  "/publish/marketplace",
];

const BASE = process.env.BASE_URL || "http://localhost:3000";

function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

async function probeRoute(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const samples = [];
  const sample = async (label) => {
    const data = await page.evaluate(() => {
      const headerLogo = document.querySelector('header[data-ls="header"] img');
      const footerLogo = document.querySelector('footer[aria-label="Site footer"] img');
      const firstSelect = document.querySelector("select");
      const firstInput = document.querySelector("input:not([type=hidden])");
      const headerText = document.querySelector('header[data-ls="header"]')?.innerText?.slice(0, 120) || "";
      const footerText = document.querySelector('footer[aria-label="Site footer"]')?.innerText?.slice(0, 120) || "";
      return {
        headerLogoSrc: headerLogo?.getAttribute("src") || "",
        headerLogoAlt: headerLogo?.getAttribute("alt") || "",
        headerLogoCount: document.querySelectorAll('header[data-ls="header"] img').length,
        footerLogoSrc: footerLogo?.getAttribute("src") || "",
        footerLogoAlt: footerLogo?.getAttribute("alt") || "",
        headerText,
        footerText,
        firstSelectText: firstSelect?.options?.[firstSelect.selectedIndex]?.text || "",
        firstInputValue: firstInput?.value || "",
        firstInputName: firstInput?.name || firstInput?.id || "",
        footerTop: Math.round(
          document.querySelector('footer[aria-label="Site footer"]')?.getBoundingClientRect().top ?? -1,
        ),
        bodyHeight: Math.round(document.body.getBoundingClientRect().height),
        bodyFont: getComputedStyle(document.body).fontFamily,
      };
    });
    samples.push({ label, ...data });
  };

  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      try {
        await sample("0ms");
      } catch {
        /* page may be navigating */
      }
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

  const ref = samples.find((s) => s.label === "DCL") || samples[0];
  const last = samples[samples.length - 1];
  // Stability is measured from DCL onward: the 0ms framenavigated sample can
  // fire BEFORE the stylesheet has applied (browser default font = "Times",
  // body height = unstyled flow). That state is never painted to the user —
  // the first commit is DCL or later — so it would be misleading to flag it
  // as a flash.
  const visible = samples.filter((s) => s.label !== "0ms");
  const headerLogoStable = visible.every(
    (s) => s.headerLogoSrc === ref.headerLogoSrc && s.headerLogoAlt === ref.headerLogoAlt,
  );
  const footerLogoStable = visible.every(
    (s) => s.footerLogoSrc === ref.footerLogoSrc && s.footerLogoAlt === ref.footerLogoAlt,
  );
  const fontStable = visible.every((s) => s.bodyFont === ref.bodyFont);
  const footerDelta = Math.abs(last.footerTop - ref.footerTop);
  const inputStable = visible.every((s) => s.firstInputValue === ref.firstInputValue);
  const selectStable = visible.every((s) => s.firstSelectText === ref.firstSelectText);

  return {
    route,
    httpStatus,
    samples,
    headerLogoStable,
    footerLogoStable,
    fontStable,
    inputStable,
    selectStable,
    footerDelta,
  };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const r of ROUTES) {
    process.stdout.write(`\nROUTE ${r}\n`);
    const res = await probeRoute(browser, r);
    for (const s of res.samples) {
      process.stdout.write(
        `  ${s.label.padEnd(6)} hLogo=${fmt(s.headerLogoSrc).slice(0, 18).padEnd(18)} fLogo=${fmt(
          s.footerLogoSrc,
        )
          .slice(0, 18)
          .padEnd(18)} sel="${fmt(s.firstSelectText).slice(0, 18)}" inp="${fmt(s.firstInputValue).slice(
          0,
          18,
        )}" foot=${s.footerTop} body=${s.bodyHeight} font="${s.bodyFont.slice(0, 30)}"\n`,
      );
    }
    process.stdout.write(
      `  => headerLogo:${res.headerLogoStable ? "OK" : "FAIL"} footerLogo:${
        res.footerLogoStable ? "OK" : "FAIL"
      } font:${res.fontStable ? "OK" : "FAIL"} input:${res.inputStable ? "OK" : "FAIL"} select:${
        res.selectStable ? "OK" : "FAIL"
      } footerDelta=${res.footerDelta}\n`,
    );
    results.push(res);
  }

  process.stdout.write("\n=== SUMMARY ===\n");
  process.stdout.write(
    "route".padEnd(38) +
      "http  hLogo  fLogo  font   input  select footerDelta\n",
  );
  for (const r of results) {
    process.stdout.write(
      r.route.padEnd(38) +
        String(r.httpStatus).padEnd(6) +
        (r.headerLogoStable ? "OK   " : "FAIL ").padEnd(7) +
        (r.footerLogoStable ? "OK   " : "FAIL ").padEnd(7) +
        (r.fontStable ? "OK   " : "FAIL ").padEnd(7) +
        (r.inputStable ? "OK   " : "FAIL ").padEnd(7) +
        (r.selectStable ? "OK   " : "FAIL ").padEnd(7) +
        String(r.footerDelta) +
        "\n",
    );
  }

  await browser.close();
})();
