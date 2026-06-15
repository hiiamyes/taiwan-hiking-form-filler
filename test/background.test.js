const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const backgroundSource = fs.readFileSync(path.join(root, "extension/background.js"), "utf8");
const routes = JSON.parse(fs.readFileSync(path.join(root, "extension/routes.json")));

function createBackground() {
  let listener;
  const sessionWrites = [];
  const tabUpdates = [];

  const context = {
    chrome: {
      runtime: {
        getURL: (file) => `chrome-extension://test/${file}`,
        onMessage: {
          addListener(callback) {
            listener = callback;
          },
        },
      },
      storage: {
        session: {
          async setAccessLevel() {},
          async set(value) {
            sessionWrites.push(value);
          },
        },
      },
      tabs: {
        async query() {
          return [{ id: 42, url: "https://example.com" }];
        },
        async update(tabId, update) {
          tabUpdates.push({ tabId, update });
        },
      },
    },
    fetch: async () => ({
      async json() {
        return structuredClone(routes);
      },
    }),
    structuredClone,
  };

  vm.runInNewContext(backgroundSource, context);
  return { listener, sessionWrites, tabUpdates };
}

function sendMessage(listener, message, sender = {}) {
  return new Promise((resolve) => {
    const asyncResponse = listener(message, sender, resolve);
    assert.equal(asyncResponse, true);
  });
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

const memberData = {
  watcher: { name: "Watcher" },
  members: [{ leader: true, name: "Leader" }],
};

test("start merges selected route, date, and members then navigates the current tab", async () => {
  const background = createBackground();
  const selectedRoute = routes.find(({ id }) => id === "dajian-two-days");

  const response = await sendMessage(background.listener, {
    type: "START_APPLICATION",
    routeId: selectedRoute.id,
    startDate: "2026-07-01",
    memberData,
  });

  assert.deepEqual(normalize(response), { ok: true });
  assert.equal(background.sessionWrites.length, 1);
  assert.equal(background.tabUpdates.length, 1);
  assert.deepEqual(normalize(background.tabUpdates[0]), {
    tabId: 42,
    update: { url: "https://hike.taiwan.gov.tw/apply_1.aspx" },
  });

  const session = background.sessionWrites[0].hikingFormFiller;
  assert.equal(session.tabId, 42);
  assert.equal(session.stage, "route");
  assert.equal(session.application.org, selectedRoute.org);
  assert.equal(session.application.route, selectedRoute.route);
  assert.equal(session.application.startDate, "2026-07-01");
  assert.deepEqual(session.application.watcher, memberData.watcher);
  assert.deepEqual(session.application.members, memberData.members);
  assert.equal(session.application.id, undefined);
  assert.equal(session.application.label, undefined);
});

test("start explains missing required input", async () => {
  const background = createBackground();

  assert.deepEqual(
    normalize(await sendMessage(background.listener, {
      type: "START_APPLICATION",
      routeId: "",
      startDate: "2026-07-01",
      memberData,
    })),
    { ok: false, error: "請選擇路線" },
  );

  assert.deepEqual(
    normalize(await sendMessage(background.listener, {
      type: "START_APPLICATION",
      routeId: routes[0].id,
      startDate: "",
      memberData,
    })),
    { ok: false, error: "請選擇入園日期" },
  );
});

test("start from the application-page launcher uses its sender tab", async () => {
  const background = createBackground();

  const response = await sendMessage(
    background.listener,
    {
      type: "START_APPLICATION",
      routeId: routes[0].id,
      startDate: "2026-07-01",
      memberData,
    },
    { tab: { id: 99 } },
  );

  assert.deepEqual(normalize(response), { ok: true });
  assert.deepEqual(normalize(background.tabUpdates[0]), {
    tabId: 99,
    update: { url: "https://hike.taiwan.gov.tw/apply_1.aspx" },
  });
  assert.equal(background.sessionWrites[0].hikingFormFiller.tabId, 99);
});
