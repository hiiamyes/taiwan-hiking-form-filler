const startButton = document.querySelector("#start");
const statusElement = document.querySelector("#status");
const routeSelect = document.querySelector("#route");
const startDateInput = document.querySelector("#start-date");
const memberFileInput = document.querySelector("#member-file");
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
  const response = await fetch(chrome.runtime.getURL("routes.json"));
  const routes = await response.json();
  for (const route of routes) {
    const option = document.createElement("option");
    option.value = route.id;
    option.textContent = `${route.label} · ${route.numOfDays} 天`;
    routeSelect.append(option);
  }
  routesLoaded = true;
  updateStartButton();
}

memberFileInput.addEventListener("change", async () => {
  memberData = null;
  updateStartButton();
  const [file] = memberFileInput.files;
  if (!file) return;

  try {
    memberData = validateMemberData(JSON.parse(await file.text()));
    statusElement.textContent = `已選擇：${file.name}`;
    updateStartButton();
  } catch (error) {
    memberFileInput.value = "";
    statusElement.textContent = `錯誤：${error.message}`;
    updateStartButton();
  }
});

routeSelect.addEventListener("change", updateStartButton);
startDateInput.addEventListener("input", updateStartButton);

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

loadRoutes().catch((error) => {
  statusElement.textContent = `錯誤：${error.message}`;
  startButton.disabled = true;
});
