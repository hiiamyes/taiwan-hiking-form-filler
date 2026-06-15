(async function () {
  if (location.pathname !== "/apply_1.aspx" || document.querySelector("#hiking-form-launcher")) {
    return;
  }

  const ROUTE_KEY = "selectedRoute";
  const START_DATE_KEY = "selectedStartDate";
  const MEMBER_DATA_KEY = "selectedMemberData";
  const MEMBER_FILE_NAME_KEY = "selectedMemberFileName";

  const [routesResponse, saved] = await Promise.all([
    fetch(chrome.runtime.getURL("routes.json")),
    chrome.storage.local.get([
      ROUTE_KEY,
      START_DATE_KEY,
      MEMBER_DATA_KEY,
      MEMBER_FILE_NAME_KEY,
    ]),
  ]);
  const routes = await routesResponse.json();
  const route = routes.find(({ id }) => id === saved[ROUTE_KEY]);
  const memberData = saved[MEMBER_DATA_KEY];
  const ready = Boolean(route && saved[START_DATE_KEY] && memberData);

  const panel = document.createElement("aside");
  panel.id = "hiking-form-launcher";

  const title = document.createElement("strong");
  title.textContent = "登山申請自動填表";

  const summary = document.createElement("div");
  summary.className = "hiking-form-launcher-summary";
  summary.textContent = [
    `路線：${route?.label || "未選擇"}`,
    `日期：${saved[START_DATE_KEY] || "未選擇"}`,
    `成員：${saved[MEMBER_FILE_NAME_KEY] || (memberData ? "已儲存資料" : "未匯入")}`,
  ].join("\n");

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.dataset.role = "start";
  startButton.textContent = "開始申請";
  startButton.disabled = !ready;

  const status = document.createElement("p");
  status.className = "hiking-form-launcher-status";
  status.textContent = ready ? "" : "請先在擴充功能 popup 設定路線、日期和成員資料。";

  startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    status.textContent = "正在開始申請...";
    const response = await chrome.runtime.sendMessage({
      type: "START_APPLICATION",
      routeId: route.id,
      startDate: saved[START_DATE_KEY],
      memberData,
    });
    if (!response?.ok) {
      status.textContent = `錯誤：${response?.error || "無法開始"}`;
      startButton.disabled = false;
    }
  });

  panel.append(title, summary, startButton, status);
  document.body.append(panel);
})().catch((error) => {
  console.error("Taiwan Hiking Form Filler launcher failed:", error);
});
