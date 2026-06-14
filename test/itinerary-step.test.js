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

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: String(currentDay) };
        if (selector === "#con_sumday") return { value: "2" };
        if (selector === "#con_applystart") return { value: "2026-07-01" };
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
      },
      async click(_elementOrGetter, description) {
        clicks.push(description);
        if (description === "完成路線" && currentDay === 2) completionVisible = false;
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
  assert.deepEqual(waits, ["目前行程天數", "第2天行程", "完成所有路線"]);
  assert.deepEqual(JSON.parse(JSON.stringify(stageUpdates)), [{ stage: "people" }]);
});

test("itinerary step configures an initial page even when next is visible", async () => {
  const checks = [];
  const clicks = [];
  const selects = [];
  const stageUpdates = [];
  let configured = false;
  let completionVisible = true;

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: configured ? "1" : "" };
        if (selector === "#con_applystart") {
          return { value: configured ? "2026-07-01" : "" };
        }
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
      },
      async click(_elementOrGetter, description) {
        clicks.push(description);
        if (description === "完成路線") completionVisible = false;
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

  const context = {
    document: {
      querySelector(selector) {
        if (selector === '[id$="hidnowday"]') return { value: "1" };
        if (selector === "#con_sumday") return { value: "1" };
        if (selector === "#con_applystart") return { value: "2026-07-23" };
        if (selector === "#con_btnover, #con_step1_btnover") {
          return completionVisible ? completionButton : null;
        }
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
