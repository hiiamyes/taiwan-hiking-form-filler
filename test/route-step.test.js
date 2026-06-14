const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const routeStepSource = fs.readFileSync(path.join(root, "extension/steps/route.js"), "utf8");

test("route step uses the exact organization and visible route link", async () => {
  const clicks = [];
  const stageUpdates = [];
  const organization = "雪霸國家公園管理處";
  const route = "(4級) 大劍線";

  const wrongLink = { text: "進入申請", click: () => clicks.push("wrong-link") };
  const rightLink = { text: "進入申請", click: () => clicks.push("right-link") };
  const hiddenRoute = {
    text: route,
    getClientRects: () => [],
    parentElement: { parentElement: { querySelectorAll: () => [wrongLink] } },
  };
  const visibleRoute = {
    text: route,
    getClientRects: () => [{}],
    parentElement: { parentElement: { querySelectorAll: () => [rightLink] } },
  };
  const organizationButton = {
    text: organization,
    click: () => clicks.push("organization"),
  };

  const context = {
    document: {
      querySelectorAll(selector) {
        return selector === "*" ? [hiddenRoute, visibleRoute] : [];
      },
    },
    HikingFormHelpers: {
      byText(text, options) {
        assert.equal(text, organization);
        assert.equal(options.exact, true);
        assert.equal(options.selector, "button, input[type=button], input[type=submit]");
        return organizationButton;
      },
      async click(elementOrGetter) {
        const element =
          typeof elementOrGetter === "function" ? elementOrGetter() : elementOrGetter;
        element.click();
      },
      textOf(element) {
        return element.text;
      },
      async waitFor(getElement) {
        const element = getElement();
        assert.ok(element);
        return element;
      },
    },
  };

  vm.runInNewContext(routeStepSource, context);
  await context.HikingFormStepHandlers.route(
    { org: organization, route },
    async (patch) => stageUpdates.push(patch),
  );

  assert.deepEqual(clicks, ["organization", "right-link"]);
  assert.deepEqual(JSON.parse(JSON.stringify(stageUpdates)), [{ stage: "agreements" }]);
});
