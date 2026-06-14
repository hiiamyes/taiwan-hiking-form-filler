const startButton = document.querySelector("#start");
const statusElement = document.querySelector("#status");
const routeSelect = document.querySelector("#route");
const startDateInput = document.querySelector("#start-date");

async function loadRoutes() {
  const response = await fetch(chrome.runtime.getURL("routes.json"));
  const routes = await response.json();
  for (const route of routes) {
    const option = document.createElement("option");
    option.value = route.id;
    option.textContent = `${route.label} · ${route.numOfDays} 天`;
    routeSelect.append(option);
  }
  startButton.disabled = false;
}

startButton.addEventListener("click", async () => {
  if (!startDateInput.value) {
    statusElement.textContent = "請選擇入園日期";
    return;
  }

  startButton.disabled = true;
  statusElement.textContent = "正在開啟申請頁面...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_APPLICATION",
      routeId: routeSelect.value,
      startDate: startDateInput.value,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "無法開始");
    }
    window.close();
  } catch (error) {
    statusElement.textContent = `錯誤：${error.message}`;
    startButton.disabled = false;
  }
});

loadRoutes().catch((error) => {
  statusElement.textContent = `錯誤：${error.message}`;
  startButton.disabled = true;
});
