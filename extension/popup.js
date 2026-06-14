const startButton = document.querySelector("#start");
const statusElement = document.querySelector("#status");
const routeSelect = document.querySelector("#route");
const startDateInput = document.querySelector("#start-date");
const memberFileInput = document.querySelector("#member-file");
const memberStatusElement = document.querySelector("#member-status");
const ROUTE_KEY = "selectedRoute";
const START_DATE_KEY = "selectedStartDate";
const MEMBER_DATA_KEY = "selectedMemberData";
const MEMBER_FILE_NAME_KEY = "selectedMemberFileName";
const SESSION_KEY = "hikingFormFiller";
let memberData = null;
let routesLoaded = false;

function updateStartButton() {
  startButton.disabled =
    !routesLoaded || !routeSelect.value || !startDateInput.value || !memberData;
}

function validateMemberData(data) {
  if (!data?.watcher || typeof data.watcher !== "object") {
    throw new Error("成員檔案缺少 watcher");
  }
  if (!Array.isArray(data.members) || data.members.length === 0) {
    throw new Error("成員檔案缺少 members");
  }
  if (data.members.filter(({ leader }) => leader).length !== 1) {
    throw new Error("成員檔案必須有一位領隊");
  }
  return {
    watcher: data.watcher,
    members: data.members,
  };
}

async function loadRoutes() {
  const [response, saved] = await Promise.all([
    fetch(chrome.runtime.getURL("routes.json")),
    chrome.storage.local.get(ROUTE_KEY),
  ]);
  const routes = await response.json();
  for (const route of routes) {
    const option = document.createElement("option");
    option.value = route.id;
    option.textContent = `${route.label} · ${route.numOfDays} 天`;
    routeSelect.append(option);
  }
  const savedRoute = saved[ROUTE_KEY];
  routeSelect.value = routes.some(({ id }) => id === savedRoute) ? savedRoute : "";
  if (savedRoute && !routeSelect.value) {
    await chrome.storage.local.remove(ROUTE_KEY);
  }
  routesLoaded = true;
  updateStartButton();
}

async function loadSavedStartDate() {
  const saved = await chrome.storage.local.get(START_DATE_KEY);
  startDateInput.value = saved[START_DATE_KEY] || "";
  updateStartButton();
}

async function loadSavedMemberData() {
  const saved = await chrome.storage.local.get([MEMBER_DATA_KEY, MEMBER_FILE_NAME_KEY]);
  if (!saved[MEMBER_DATA_KEY]) return;

  try {
    memberData = validateMemberData(saved[MEMBER_DATA_KEY]);
    memberStatusElement.textContent = `使用已儲存資料：${saved[MEMBER_FILE_NAME_KEY] || "成員資料"}`;
  } catch {
    await chrome.storage.local.remove([MEMBER_DATA_KEY, MEMBER_FILE_NAME_KEY]);
    memberData = null;
  }
  updateStartButton();
}

async function loadWorkflowError() {
  const saved = await chrome.storage.session.get(SESSION_KEY);
  const error = saved[SESSION_KEY]?.error;
  if (!error) return;

  statusElement.textContent = [
    `停在：${error.stageLabel || error.stage || "未知步驟"}`,
    `原因：${error.reason || error}`,
    error.url ? `頁面：${error.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

memberFileInput.addEventListener("change", async () => {
  const [file] = memberFileInput.files;
  if (!file) return;

  try {
    const importedMemberData = validateMemberData(JSON.parse(await file.text()));
    await chrome.storage.local.set({
      [MEMBER_DATA_KEY]: importedMemberData,
      [MEMBER_FILE_NAME_KEY]: file.name,
    });
    memberData = importedMemberData;
    memberStatusElement.textContent = `使用已儲存資料：${file.name}`;
    statusElement.textContent = "";
    updateStartButton();
  } catch (error) {
    memberFileInput.value = "";
    statusElement.textContent = `錯誤：${error.message}`;
  }
});

routeSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({
    [ROUTE_KEY]: routeSelect.value,
  });
  updateStartButton();
});
startDateInput.addEventListener("input", async () => {
  await chrome.storage.local.set({
    [START_DATE_KEY]: startDateInput.value,
  });
  updateStartButton();
});

startButton.addEventListener("click", async () => {
  if (!routeSelect.value) {
    statusElement.textContent = "請選擇路線";
    return;
  }
  if (!startDateInput.value) {
    statusElement.textContent = "請選擇入園日期";
    return;
  }
  if (!memberData) {
    statusElement.textContent = "請選擇成員 JSON 檔案";
    return;
  }

  startButton.disabled = true;
  statusElement.textContent = "正在開啟申請頁面...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_APPLICATION",
      routeId: routeSelect.value,
      startDate: startDateInput.value,
      memberData,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "無法開始");
    }
    window.close();
  } catch (error) {
    statusElement.textContent = `錯誤：${error.message}`;
    updateStartButton();
  }
});

Promise.all([
  loadRoutes(),
  loadSavedStartDate(),
  loadSavedMemberData(),
  loadWorkflowError(),
]).catch((error) => {
  statusElement.textContent = `錯誤：${error.message}`;
  startButton.disabled = true;
});
