const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const extensionPath = path.join(root, "extension");
const memberPath = path.resolve(process.env.MEMBER_FILE || path.join(root, "src/members-team.json"));
const routeId = process.env.ROUTE_ID || "qilai-main-north-three-days";
const startDate = process.env.START_DATE || "2026-11-05";
const teamName = process.env.TEAM_NAME || "E2E Test";
const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === "1";
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "hiking-extension-e2e-"));

const routes = JSON.parse(fs.readFileSync(path.join(extensionPath, "routes.json"), "utf8"));
const memberData = JSON.parse(fs.readFileSync(memberPath, "utf8"));
const route = routes.find((item) => item.id === routeId);

if (!route) {
  throw new Error(`Unknown route: ${routeId}`);
}

async function run() {
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }

    await worker.evaluate(
      async ({ memberData, routeId, startDate, teamName }) => {
        await chrome.storage.local.set({
          selectedMemberData: memberData,
          selectedMemberFileName: "members-team.json",
          selectedRoute: routeId,
          selectedStartDate: startDate,
          selectedTeamName: teamName,
        });
      },
      { memberData, routeId, startDate, teamName },
    );

    const page = await context.newPage();
    page.on("dialog", async (dialog) => {
      console.log(`[browser:dialog] ${dialog.message()}`);
      await dialog.dismiss();
    });
    page.on("console", (message) => {
      if (["info", "error", "warning"].includes(message.type())) {
        console.log(`[browser:${message.type()}] ${message.text()}`);
      }
    });

    await page.goto("https://hike.taiwan.gov.tw/apply_1.aspx", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#hiking-form-launcher button[data-role=start]").click();

    const deadline = Date.now() + 180000;
    let finalStartedAt = null;
    while (Date.now() < deadline) {
      const session = await worker.evaluate(async () => {
        const stored = await chrome.storage.session.get("hikingFormFiller");
        return stored.hikingFormFiller;
      });

      if (session?.stage === "done") {
        console.log(`E2E passed: ${route.label} reached the final review page.`);
        return;
      }

      if (session?.stage === "final") {
        finalStartedAt ||= Date.now();
        if (Date.now() - finalStartedAt > 5000) {
          const nextControl = await page.locator("#con_step2_bt_Next_D").evaluate((element) => ({
            tag: element.tagName,
            name: element.getAttribute("name"),
            href: element.getAttribute("href"),
            onclick: element.getAttribute("onclick"),
            type: element.getAttribute("type"),
          }));
          console.log("Final control:", nextControl);
          const validationMessages = await page
            .locator('[id*="Validator"], .error, .field-validation-error, .text-danger')
            .evaluateAll((elements) =>
              elements
                .filter((element) => element.offsetParent)
                .map((element) => element.textContent.trim())
                .filter(Boolean),
            );
          console.log("Validation messages:", validationMessages);
          const inputMetadata = await page.locator("input").evaluateAll((elements) =>
            elements
              .map((element) => ({
                id: element.id,
                name: element.getAttribute("name"),
                placeholder: element.getAttribute("placeholder"),
              }))
              .filter((element) => element.id.includes("leader")),
          );
          console.log("Leader inputs:", inputMetadata);
          throw new Error("Final control did not navigate");
        }
      }

      if (session?.stage === "error") {
        const memberSelectIds = await page
          .locator('select[id*="lisMem"]')
          .evaluateAll((elements) => elements.map((element) => element.id));
        console.log("Member select IDs:", memberSelectIds);
        const controls = await page
          .locator('button, a, input[type="button"], input[type="submit"]')
          .evaluateAll((elements) =>
            elements
              .map((element) => ({
                id: element.id,
                text: (element.innerText || element.value || "").trim(),
              }))
              .filter((element) => element.id || element.text.includes("下一步")),
          );
        console.log("Page controls:", controls);
        throw new Error(`${session.error?.stageLabel}: ${session.error?.reason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("E2E timed out before reaching the final review page");
  } finally {
    if (keepBrowserOpen) {
      console.log("Browser left open for inspection. Press Ctrl+C when finished.");
    } else {
      await context.close();
      fs.rmSync(profilePath, { force: true, recursive: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
