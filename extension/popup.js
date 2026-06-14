const templatesContainer = document.querySelector("#templates");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset");

function renderStatus(session) {
  if (!session || session.phase === "idle") {
    statusElement.textContent = "尚未開始";
    return;
  }

  statusElement.textContent =
    session.phase === "error"
      ? `錯誤：${session.message || "未知錯誤"}`
      : `目前狀態：${session.phase}`;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch((error) => {
    statusElement.textContent = `錯誤：${error.message}`;
  });
}

for (const template of HikingTemplates.TEMPLATES) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = template.label;
  button.addEventListener("click", () => {
    statusElement.textContent = `正在開始：${template.label}`;
    sendMessage({ type: "START_APPLICATION", templateId: template.id });
  });
  templatesContainer.append(button);
}

resetButton.addEventListener("click", async () => {
  await sendMessage({ type: "RESET_SESSION" });
  renderStatus({ phase: "idle" });
});

sendMessage({ type: "GET_SESSION" }).then(renderStatus);
