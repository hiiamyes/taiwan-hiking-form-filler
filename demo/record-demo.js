const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const extensionPath = path.join(root, "extension");
const memberPath = path.resolve(process.env.MEMBER_FILE || path.join(root, "src/members-demo.json"));
const routeId = process.env.ROUTE_ID || "qilai-main-north-three-days";
const startDate = process.env.START_DATE || "2026-11-05";
const teamName = process.env.TEAM_NAME || "Demo Team";
const outputDir = path.resolve(process.env.DEMO_DIR || __dirname);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "hiking-demo-"));

const routes = JSON.parse(fs.readFileSync(path.join(extensionPath, "routes.json"), "utf8"));
const memberData = JSON.parse(fs.readFileSync(memberPath, "utf8"));
const route = routes.find((item) => item.id === routeId);

if (!route) throw new Error(`Unknown route: ${routeId}`);
fs.mkdirSync(outputDir, { recursive: true });

function convertToMp4(webmPath, mp4Path) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Path,
    ],
    { stdio: "inherit" },
  );

  if (result.error?.code === "ENOENT") {
    throw new Error("ffmpeg is required to create the MP4. Install it first, e.g. `brew install ffmpeg`.");
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}`);
  }
}

async function run() {
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 },
    },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let video;
  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent("serviceworker");

    await worker.evaluate(
      async ({ memberData, routeId, startDate, teamName }) => {
        await chrome.storage.local.set({
          selectedMemberData: memberData,
          selectedMemberFileName: "members-demo.json",
          selectedRoute: routeId,
          selectedStartDate: startDate,
          selectedTeamName: teamName,
        });
      },
      { memberData, routeId, startDate, teamName },
    );

    const page = await context.newPage();
    video = page.video();

    page.on("dialog", async (dialog) => {
      console.log(`[dialog] ${dialog.message()}`);
      await dialog.dismiss();
    });

    await page.goto("https://hike.taiwan.gov.tw/apply_1.aspx", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#hiking-form-launcher button[data-role=start]").click();

    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const session = await worker.evaluate(async () => {
        const stored = await chrome.storage.session.get("hikingFormFiller");
        return stored.hikingFormFiller;
      });

      if (session?.stage === "done") {
        console.log(`Demo complete: ${route.label} reached the final review page.`);
        await page.waitForTimeout(3000);
        break;
      }

      if (session?.stage === "error") {
        throw new Error(`${session.error?.stageLabel}: ${session.error?.reason}`);
      }

      await page.waitForTimeout(500);
    }
  } finally {
    await context.close();
    fs.rmSync(profilePath, { force: true, recursive: true });
  }

  if (!video) throw new Error("No Playwright video was created.");

  const recordedPath = await video.path();
  const webmPath = path.join(outputDir, `${routeId}-members-demo.webm`);
  const mp4Path = path.join(outputDir, `${routeId}-members-demo.mp4`);

  if (recordedPath !== webmPath) {
    fs.rmSync(webmPath, { force: true });
    fs.renameSync(recordedPath, webmPath);
  }

  fs.rmSync(mp4Path, { force: true });
  convertToMp4(webmPath, mp4Path);
  fs.rmSync(webmPath, { force: true });

  console.log(`Saved demo video: ${mp4Path}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
