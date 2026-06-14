const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const routes = JSON.parse(fs.readFileSync(path.join(root, "extension/routes.json")));
const helpersSource = fs.readFileSync(path.join(root, "extension/helpers.js"), "utf8");
const routeStepSource = fs.readFileSync(path.join(root, "extension/steps/route.js"), "utf8");
const startUrl = "https://hike.taiwan.gov.tw/apply_1.aspx";

test(
  "live apply page resolves every org and route pair to its own application link",
  { timeout: 120000 },
  async (t) => {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Playwright Chromium is unavailable: ${error.message}`);
      return;
    }

    try {
      const page = await browser.newPage();

      for (const route of routes) {
        await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.addScriptTag({ content: helpersSource });
        await page.addScriptTag({ content: routeStepSource });

        const result = await page.evaluate(async ({ org, route }) => {
          let clicked = null;
          let stage = null;
          const originalAnchorClick = HTMLAnchorElement.prototype.click;

          HTMLAnchorElement.prototype.click = function click() {
            clicked = {
              href: this.href,
              containerText: this.parentElement?.parentElement?.textContent || "",
            };
          };

          try {
            await globalThis.HikingFormStepHandlers.route({ org, route }, async (patch) => {
              stage = patch.stage;
            });
            return { clicked, stage };
          } finally {
            HTMLAnchorElement.prototype.click = originalAnchorClick;
          }
        }, route);

        assert.equal(result.stage, "agreements", `${route.label} did not advance its stage`);
        assert.ok(result.clicked, `${route.label} did not resolve an application link`);
        assert.match(result.clicked.containerText.replace(/\s+/g, " "), new RegExp(route.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.ok(result.clicked.href, `${route.label} application link has no href`);
      }
    } finally {
      await browser.close();
    }
  },
);
