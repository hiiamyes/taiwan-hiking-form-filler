const startButton = document.querySelector("#start");
const statusElement = document.querySelector("#status");

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  statusElement.textContent = "正在開啟申請頁面...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_APPLICATION",
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
