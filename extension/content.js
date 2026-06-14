const SESSION_KEY = "hikingFormFiller";
const steps = globalThis.HikingFormSteps;

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
    console.error("Taiwan Hiking Form Filler failed:", error);
    await updateSession({ active: false, stage: "error", error: error.message });
    alert(`自動填表失敗：${error.message}`);
  }
}

run();
