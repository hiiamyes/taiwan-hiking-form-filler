const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const itineraryStepSource = fs.readFileSync(
  path.join(root, "extension/steps/itinerary.js"),
  "utf8",
);

test("itinerary step waits for each route-completion AJAX update", async () => {
  const checks = [];
  const clicks = [];
  const waits = [];
  const stageUpdates = [];
  let currentDay = 1;
  let completionVisible = true;
  const schedule = { text: "" };
  const routePrompt = { getClientRects: () => [{}] };

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: String(currentDay) };
        if (selector === "#con_sumday") return { value: "2" };
        if (selector === "#con_applystart") return { value: "2026-07-01" };
        if (selector === "#con_lblSchedule, #con_step1_lblSchedule") return schedule;
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return routePrompt;
        if (selector === "#con_btnover, #con_step1_btnover") {
          return completionVisible ? {} : null;
        }
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check(_elementOrGetter, description) {
        checks.push(description);
        schedule.text += description;
      },
      async click(_elementOrGetter, description) {
        clicks.push(description);
        if (description === "完成路線" && currentDay === 2) {
          completionVisible = false;
          routePrompt.getClientRects = () => [];
        }
      },
      clickableByText(text) {
        if (text === "完成路線" && !completionVisible) return null;
        return {};
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select() {},
      async sleep() {},
      textOf(element) {
        return element?.text || "";
      },
      async waitFor(getValue, description) {
        waits.push(description);
        if (description === "第2天行程") currentDay = 2;
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-01",
      numOfDays: 2,
      plan: [{ spots: ["第一天地點"] }, { spots: ["第二天地點"] }],
    },
    async (patch) => stageUpdates.push(patch),
  );

  assert.deepEqual(checks, ["第一天地點", "第二天地點"]);
  assert.deepEqual(clicks, ["完成路線", "完成路線", "下一步"]);
  assert.deepEqual(waits, [
    "目前行程天數",
    "路線地點：第一天地點",
    "第2天行程",
    "路線地點：第二天地點",
    "完成路線",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(stageUpdates)), [{ stage: "people" }]);
});

test("itinerary step configures an initial page even when next is visible", async () => {
  const checks = [];
  const clicks = [];
  const selects = [];
  const stageUpdates = [];
  let configured = false;
  let completionVisible = true;
  const schedule = { text: "" };
  const routePrompt = { getClientRects: () => [{}] };

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: configured ? "1" : "" };
        if (selector === "#con_applystart") {
          return { value: configured ? "2026-07-01" : "" };
        }
        if (selector === "#con_lblSchedule, #con_step1_lblSchedule") return schedule;
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return routePrompt;
        if (selector === "#con_btnover, #con_step1_btnover") {
          return completionVisible ? {} : null;
        }
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check(_elementOrGetter, description) {
        checks.push(description);
        schedule.text += description;
      },
      async click(_elementOrGetter, description) {
        clicks.push(description);
        if (description === "完成路線") {
          completionVisible = false;
          routePrompt.getClientRects = () => [];
        }
      },
      clickableByText(text) {
        if (text === "完成路線" && !completionVisible) return null;
        return { getClientRects: () => [{}] };
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select(_elementOrGetter, _value, description) {
        selects.push(description);
        if (description === "入園日期") configured = true;
      },
      async sleep() {},
      textOf(element) {
        return element?.text || "";
      },
      async waitFor(getValue) {
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-01",
      numOfDays: 1,
      plan: [{ spots: ["第一天地點"] }],
    },
    async (patch) => stageUpdates.push(patch),
  );

  assert.deepEqual(selects, ["行程天數", "入園日期"]);
  assert.deepEqual(checks, ["第一天地點"]);
  assert.deepEqual(clicks, ["完成路線", "下一步"]);
  assert.deepEqual(JSON.parse(JSON.stringify(stageUpdates)), [{ stage: "people" }]);
});

test("itinerary step clicks the stable completion-button ID from the live markup", async () => {
  const completionButton = {};
  const clickedElements = [];
  let completionVisible = true;
  const routePrompt = { getClientRects: () => [{}] };

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: "1" };
        if (selector === "#con_applystart") return { value: "2026-07-23" };
        if (selector === "#con_btnover, #con_step1_btnover") {
          return completionVisible ? completionButton : null;
        }
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return routePrompt;
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check() {},
      async click(elementOrGetter) {
        clickedElements.push(elementOrGetter());
        completionVisible = false;
        routePrompt.getClientRects = () => [];
      },
      clickableByText(text) {
        return text === "下一步" ? {} : null;
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select() {},
      async sleep() {},
      textOf() {
        return "";
      },
      async waitFor(getValue) {
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-23",
      numOfDays: 1,
      plan: [{ spots: [] }],
    },
    async () => {},
  );

  assert.equal(clickedElements[0], completionButton);
});

test("itinerary step waits for each selected spot to appear before completing the route", async () => {
  const events = [];
  const schedule = { text: "" };
  let completionVisible = true;
  const routePrompt = { getClientRects: () => [{}] };

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: "1" };
        if (selector === "#con_applystart") return { value: "2026-07-23" };
        if (selector === "#con_lblSchedule, #con_step1_lblSchedule") return schedule;
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return routePrompt;
        if (selector === "#con_btnover, #con_step1_btnover") {
          return completionVisible ? {} : null;
        }
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check(_elementOrGetter, description) {
        events.push(`check:${description}`);
      },
      async click(_elementOrGetter, description) {
        events.push(`click:${description}`);
        completionVisible = false;
        routePrompt.getClientRects = () => [];
      },
      clickableByText(text) {
        return text === "下一步" ? {} : null;
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select() {},
      async sleep() {},
      textOf(element) {
        return element?.text || "";
      },
      async waitFor(getValue, description) {
        events.push(`wait:${description}`);
        if (description === "路線地點：桃山") schedule.text = "第1天行程：桃山";
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-23",
      numOfDays: 1,
      plan: [{ spots: ["桃山"] }],
    },
    async () => {},
  );

  assert.deepEqual(events.slice(0, 4), [
    "wait:目前行程天數",
    "check:桃山",
    "wait:路線地點：桃山",
    "click:完成路線",
  ]);
});

test("final route completion waits for the next-location prompt to hide", async () => {
  const waits = [];
  const routePrompt = { getClientRects: () => [{}] };

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: "1" };
        if (selector === "#con_applystart") return { value: "2026-07-23" };
        if (selector === "#con_btnover, #con_step1_btnover") return {};
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return routePrompt;
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check() {},
      async click() {},
      clickableByText() {
        return {};
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select() {},
      async sleep() {},
      textOf() {
        return "";
      },
      async waitFor(getValue, description) {
        waits.push(description);
        if (description === "完成路線") routePrompt.getClientRects = () => [];
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-23",
      numOfDays: 1,
      plan: [{ spots: [] }],
    },
    async () => {},
  );

  assert.ok(waits.includes("完成路線"));
  assert.ok(!waits.includes("完成所有路線"));
});

test("itinerary step skips completion click when the final route is already complete", async () => {
  const clicks = [];
  const stageUpdates = [];

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: "1" };
        if (selector === "#con_applystart") return { value: "2026-07-23" };
        if (selector === "#con_lblSchedule, #con_step1_lblSchedule") {
          return { text: "第1天行程：武陵四秀登山口 桃山登山口 桃山 桃山登山口 武陵四秀登山口" };
        }
        if (selector === "#con_btnover, #con_step1_btnover") return null;
        if (selector === "#con_lbRoute, #con_step1_lbRoute") return null;
        return {};
      },
      querySelectorAll() {
        return [];
      },
    },
    HikingFormHelpers: {
      async check() {
        throw new Error("should not select spots again");
      },
      async click(_elementOrGetter, description) {
        clicks.push(description);
      },
      clickableByText() {
        return {};
      },
      async fill() {},
      inputByText() {
        return {};
      },
      async select() {},
      async sleep() {},
      textOf(element) {
        return element?.text || "";
      },
      async waitFor(getValue) {
        const value = getValue();
        assert.ok(value);
        return value;
      },
    },
  };

  vm.runInNewContext(itineraryStepSource, context);
  await context.HikingFormStepHandlers.itinerary(
    {
      org: "雪霸國家公園管理處",
      startDate: "2026-07-23",
      numOfDays: 1,
      plan: [{ spots: ["武陵四秀登山口", "桃山登山口", "桃山", "桃山登山口", "武陵四秀登山口"] }],
    },
    async (patch) => stageUpdates.push(patch),
  );

  assert.deepEqual(clicks, ["下一步"]);
  assert.deepEqual(JSON.parse(JSON.stringify(stageUpdates)), [{ stage: "people" }]);
});
