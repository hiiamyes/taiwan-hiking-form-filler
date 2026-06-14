const SESSION_KEY = "hikingFormFiller";
const START_URL = "https://hike.taiwan.gov.tw/apply_1.aspx";

chrome.action.onClicked.addListener(async () => {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  const response = await fetch(chrome.runtime.getURL("application.json"));
  const application = await response.json();

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
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CURRENT_TAB") {
    sendResponse({ id: sender.tab?.id });
  }
});
