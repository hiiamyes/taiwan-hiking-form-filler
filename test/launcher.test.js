const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const launcherSource = fs.readFileSync(path.join(root, "extension/content.js"), "utf8");

test("application-page launcher starts with saved selections", async () => {
  const messages = [];
  const elements = new Map();
  const route = { id: "taoshan-day-hike", label: "桃山單攻", numOfDays: 1 };
  const saved = {
    selectedRoute: route.id,
    selectedTeamName: "桃山隊",
    selectedStartDate: "2026-07-23",
    selectedMemberData: {
      watcher: { name: "Watcher" },
      members: [{ leader: true, name: "Leader" }],
    },
    selectedMemberFileName: "members.json",
  };

  function element() {
    return {
      children: [],
      dataset: {},
      disabled: false,
      listeners: {},
      append(...children) {
        this.children.push(...children);
      },
      addEventListener(type, listener) {
        this.listeners[type] = listener;
      },
      remove() {},
      set textContent(value) {
        this.text = value;
      },
    };
  }

  const document = {
    body: element(),
    createElement() {
      return element();
    },
    querySelector(selector) {
      return elements.get(selector) || null;
    },
  };

  const context = {
    HikingFormSteps: {},
    chrome: {
      runtime: {
        getURL: (file) => file,
        async sendMessage(message) {
          if (message.type === "CURRENT_TAB") return { id: 42 };
          messages.push(message);
          return { ok: true };
        },
      },
      storage: {
        local: {
          async get() {
            return saved;
          },
        },
        session: {
          async get() {
            return {};
          },
          async set() {},
        },
      },
    },
    document,
    fetch: async () => ({ json: async () => [route] }),
    location: { pathname: "/apply_1.aspx" },
  };

  vm.runInNewContext(launcherSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  const panel = document.body.children.find(({ id }) => id === "hiking-form-launcher");
  const startButton = panel.children.find(({ dataset }) => dataset.role === "start");
  assert.ok(startButton);
  assert.equal(startButton.disabled, false);

  await startButton.listeners.click();

  assert.deepEqual(JSON.parse(JSON.stringify(messages)), [
    {
      type: "START_APPLICATION",
      routeId: route.id,
      teamName: "桃山隊",
      startDate: "2026-07-23",
      memberData: saved.selectedMemberData,
    },
  ]);
});

test("application-page launcher disables start when saved selections are incomplete", async () => {
  const elements = new Map();

  function element() {
    return {
      children: [],
      dataset: {},
      append(...children) {
        this.children.push(...children);
      },
      addEventListener() {},
      set textContent(value) {
        this.text = value;
      },
    };
  }

  const document = {
    body: element(),
    createElement() {
      return element();
    },
    querySelector(selector) {
      return elements.get(selector) || null;
    },
  };

  const context = {
    HikingFormSteps: {},
    chrome: {
      runtime: {
        getURL: (file) => file,
      },
      storage: {
        local: {
          async get() {
            return {};
          },
        },
        session: {
          async get() {
            return {};
          },
          async set() {},
        },
      },
    },
    document,
    fetch: async () => ({ json: async () => [] }),
    location: { pathname: "/apply_1.aspx" },
  };

  vm.runInNewContext(launcherSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  const panel = document.body.children.find(({ id }) => id === "hiking-form-launcher");
  const startButton = panel.children.find(({ dataset }) => dataset.role === "start");
  const status = panel.children.at(-1);
  assert.equal(startButton.disabled, true);
  assert.match(status.text, /請先在擴充功能 popup 設定/);
});

test("application-page launcher remains visible when route data fails to load", async () => {
  const saved = {
    selectedRoute: "taoshan-day-hike",
    selectedTeamName: "桃山隊",
    selectedStartDate: "2026-07-23",
    selectedMemberData: {
      watcher: { name: "Watcher" },
      members: [{ leader: true, name: "Leader" }],
    },
    selectedMemberFileName: "members.json",
  };

  function element() {
    return {
      children: [],
      dataset: {},
      append(...children) {
        this.children.push(...children);
      },
      addEventListener() {},
      set textContent(value) {
        this.text = value;
      },
    };
  }

  const document = {
    body: element(),
    createElement() {
      return element();
    },
    querySelector() {
      return null;
    },
  };

  const context = {
    HikingFormSteps: {},
    chrome: {
      runtime: {
        getURL: (file) => file,
        async sendMessage(message) {
          if (message.type === "CURRENT_TAB") return { id: 42 };
          return { ok: true };
        },
      },
      storage: {
        local: {
          async get() {
            return saved;
          },
        },
        session: {
          async get() {
            return {};
          },
          async set() {},
        },
      },
    },
    console,
    document,
    fetch: async () => {
      throw new Error("route data unavailable");
    },
    location: { pathname: "/apply_1.aspx" },
  };

  vm.runInNewContext(launcherSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  const panel = document.body.children.find(({ id }) => id === "hiking-form-launcher");
  const startButton = panel.children.find(({ dataset }) => dataset.role === "start");
  const status = panel.children.at(-1);
  assert.ok(panel);
  assert.equal(startButton.disabled, false);
  assert.equal(status.text, "");
});
