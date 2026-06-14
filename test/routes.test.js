const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const routes = JSON.parse(fs.readFileSync(path.join(root, "extension/routes.json")));
const sourceFiles = [
  "src/application.大劍兩天.json",
  "src/application.奇萊主北兩天.sample.json",
  "src/application.桃山單攻.sample.json",
  "src/application.玉山主東兩天.sample.json",
  "src/application.雪山主東三天.sample.json",
];

test("route catalog preserves reusable route data from source applications", () => {
  assert.equal(routes.length, sourceFiles.length);

  sourceFiles.forEach((sourceFile, index) => {
    const source = JSON.parse(fs.readFileSync(path.join(root, sourceFile)));
    const route = routes[index];

    assert.deepEqual(
      {
        org: route.org,
        route: route.route,
        destination: route.destination,
        numOfDays: route.numOfDays,
        plan: route.plan,
      },
      {
        org: source.org,
        route: source.route,
        destination: source.destination,
        numOfDays: source.numOfDays,
        plan: source.plan,
      },
    );
  });
});

test("route catalog has unique IDs and labels", () => {
  assert.equal(new Set(routes.map(({ id }) => id)).size, routes.length);
  assert.equal(new Set(routes.map(({ label }) => label)).size, routes.length);
});
