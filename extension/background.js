const SESSION_KEY = "hikingFormFiller";
const START_URL = "https://hike.taiwan.gov.tw/apply_1.aspx";

async function startApplication(routeId, startDate) {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  const [applicationResponse, routesResponse] = await Promise.all([
    fetch(chrome.runtime.getURL("application.json")),
    fetch(chrome.runtime.getURL("routes.json")),
  ]);
  const [baseApplication, routes] = await Promise.all([
    applicationResponse.json(),
    routesResponse.json(),
  ]);
  const route = routes.find(({ id }) => id === routeId);
  if (!route) throw new Error("找不到選擇的路線");
  if (!startDate) throw new Error("請選擇入園日期");
  const { id: _id, label: _label, ...routeData } = route;

  const application = {
    ...baseApplication,
    ...routeData,
    startDate,
  };

  const tab = await chrome.tabs.create({ url: "about:blank" });
  await chrome.storage.session.set({
    [SESSION_KEY]: {
      active: true,
      tabId: tab.id,
      stage: "route",
      application,
    },
  });
  await chrome.tabs.update(tab.id, { url: START_URL });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CURRENT_TAB") {
    sendResponse({ id: sender.tab?.id });
    return;
  }

  if (message.type === "START_APPLICATION") {
    startApplication(message.routeId, message.startDate)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
