const SESSION_KEY = "hikingFormFiller";
const START_URL = "https://hike.taiwan.gov.tw/apply_1.aspx";

async function startApplication(routeId, startDate, memberData, senderTabId) {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  const routesResponse = await fetch(chrome.runtime.getURL("routes.json"));
  const routes = await routesResponse.json();
  if (!routeId) throw new Error("請選擇路線");
  const route = routes.find(({ id }) => id === routeId);
  if (!route) throw new Error("找不到選擇的路線");
  if (!startDate) throw new Error("請選擇入園日期");
  if (!memberData?.watcher || !Array.isArray(memberData.members)) {
    throw new Error("請選擇有效的成員檔案");
  }
  if (memberData.members.filter(({ leader }) => leader).length !== 1) {
    throw new Error("成員檔案必須有一位領隊");
  }
  const { id: _id, label: _label, ...routeData } = route;

  const application = {
    ...routeData,
    startDate,
    watcher: memberData.watcher,
    members: memberData.members,
  };

  const [activeTab] = senderTabId
    ? []
    : await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = senderTabId || activeTab?.id;
  if (!tabId) throw new Error("找不到目前分頁");

  await chrome.storage.session.set({
    [SESSION_KEY]: {
      active: true,
      tabId,
      stage: "route",
      application,
      error: null,
    },
  });
  await chrome.tabs.update(tabId, { url: START_URL });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CURRENT_TAB") {
    sendResponse({ id: sender.tab?.id });
    return;
  }

  if (message.type === "START_APPLICATION") {
    startApplication(message.routeId, message.startDate, message.memberData, sender.tab?.id)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
