const SESSION_KEY = "hikingFormFiller";
const steps = globalThis.HikingFormSteps;
const ROUTE_KEY = "selectedRoute";
const TEAM_NAME_KEY = "selectedTeamName";
const START_DATE_KEY = "selectedStartDate";
const MEMBER_DATA_KEY = "selectedMemberData";
const MEMBER_FILE_NAME_KEY = "selectedMemberFileName";
const STAGE_LABELS = {
  agreements: "同意注意事項",
  itinerary: "填寫路線行程",
  itineraryDone: "完成路線行程",
  people: "填寫申請人、隊員與留守人",
  route: "選擇管理處與路線",
};

async function renderLauncher() {
  if (location.pathname !== "/apply_1.aspx" || document.querySelector("#hiking-form-launcher")) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    #hiking-form-launcher {
      position: fixed; z-index: 2147483647; right: 18px; bottom: 18px;
      box-sizing: border-box; width: min(320px, calc(100vw - 36px));
      border: 1px solid #cad3cc; border-radius: 12px; padding: 14px;
      background: #f5f7f2; box-shadow: 0 8px 30px rgb(23 32 24 / 20%);
      color: #172018; font: 14px/1.45 system-ui, sans-serif;
    }
    #hiking-form-launcher strong { display: block; margin-bottom: 8px; font-size: 16px; }
    #hiking-form-launcher .summary { margin-bottom: 10px; white-space: pre-line; }
    #hiking-form-launcher button {
      width: 100%; border: 0; border-radius: 8px; padding: 9px 12px;
      background: #176b3a; color: white; font: inherit; font-weight: 700; cursor: pointer;
    }
    #hiking-form-launcher button:disabled { cursor: not-allowed; opacity: 0.65; }
    #hiking-form-launcher .status {
      margin: 8px 0 0; color: #526057; font-size: 12px; white-space: pre-wrap;
    }
  `;

  const panel = document.createElement("aside");
  panel.id = "hiking-form-launcher";

  const title = document.createElement("strong");
  title.textContent = "登山申請自動填表";

  const summary = document.createElement("div");
  summary.className = "summary";
  summary.textContent = "正在載入已儲存設定...";

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.dataset.role = "start";
  startButton.textContent = "開始申請";
  startButton.disabled = true;

  const status = document.createElement("p");
  status.className = "status";

  panel.append(title, summary, startButton, status);
  document.body.append(style, panel);

  try {
    const saved = await chrome.storage.local.get([
      ROUTE_KEY,
      TEAM_NAME_KEY,
      START_DATE_KEY,
      MEMBER_DATA_KEY,
      MEMBER_FILE_NAME_KEY,
    ]);
    const routeId = saved[ROUTE_KEY];
    const teamName = saved[TEAM_NAME_KEY];
    const memberData = saved[MEMBER_DATA_KEY];
    const ready = Boolean(routeId && teamName && saved[START_DATE_KEY] && memberData);
    let routeLabel = routeId || "未選擇";
    try {
      const routesResponse = await fetch(chrome.runtime.getURL("routes.json"));
      const routes = await routesResponse.json();
      routeLabel = routes.find(({ id }) => id === routeId)?.label || routeLabel;
    } catch {
      // The saved route ID is enough to start; the catalog is only used for its display label.
    }

    summary.textContent = [
      `路線：${routeLabel}`,
      `隊伍：${teamName || "未輸入"}`,
      `日期：${saved[START_DATE_KEY] || "未選擇"}`,
      `成員：${saved[MEMBER_FILE_NAME_KEY] || (memberData ? "已儲存資料" : "未匯入")}`,
    ].join("\n");
    status.textContent = ready ? "" : "請先在擴充功能 popup 設定路線、隊伍名稱、日期和成員資料。";
    startButton.disabled = !ready;

    startButton.addEventListener("click", async () => {
      startButton.disabled = true;
      status.textContent = "正在開始申請...";
      const response = await chrome.runtime.sendMessage({
        type: "START_APPLICATION",
        routeId,
        teamName,
        startDate: saved[START_DATE_KEY],
        memberData,
      });
      if (!response?.ok) {
        status.textContent = `錯誤：${response?.error || "無法開始"}`;
        startButton.disabled = false;
      }
    });
  } catch (error) {
    summary.textContent = "無法載入已儲存設定";
    status.textContent = `錯誤：${error.message}`;
  }
}

async function updateSession(patch) {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  await chrome.storage.session.set({
    [SESSION_KEY]: { ...stored[SESSION_KEY], ...patch },
  });
}

async function run() {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  const session = stored[SESSION_KEY];
  if (!session?.active) return;

  const tab = await chrome.runtime.sendMessage({ type: "CURRENT_TAB" });
  if (session.tabId !== tab.id) return;

  try {
    const step = steps[session.stage];
    if (step) {
      await step(session.application, updateSession);
    } else if (session.stage === "final") {
      document.documentElement.style.transform = "scale(0.5)";
      document.documentElement.style.transformOrigin = "top left";
      await updateSession({ active: false, stage: "done" });
      console.info("Taiwan Hiking Form Filler: 請手動確認資料、輸入驗證碼並送出。");
    }
  } catch (error) {
    const failedStage = session.stage;
    const reason = error?.message || String(error);
    const details = {
      stage: failedStage,
      stageLabel: STAGE_LABELS[failedStage] || failedStage,
      url: location.href,
      reason,
    };
    console.error("Taiwan Hiking Form Filler failed:", details, error);
    await updateSession({
      active: false,
      stage: "error",
      error: details,
    });
  }
}

renderLauncher().catch((error) => {
  console.error("Taiwan Hiking Form Filler launcher failed:", error);
});
run();
