const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const {
  TEMPLATES,
  loadTemplate,
  validateTemplate,
} = require("../extension/lib/templates.js");

const root = path.resolve(__dirname, "..");

test("catalog exposes four unique template IDs", () => {
  assert.equal(TEMPLATES.length, 4);
  assert.equal(new Set(TEMPLATES.map(({ id }) => id)).size, 4);
});

test("bundled templates preserve the canonical application contents", async () => {
  for (const template of TEMPLATES) {
    const canonical = await fs.readFile(
      path.join(root, "applications", template.fileName),
    );
    const bundled = await fs.readFile(
      path.join(root, "extension", "templates", template.fileName),
    );

    assert.deepEqual(bundled, canonical);
  }
});

test("every template loads from an extension URL", async () => {
  const requestedUrls = [];
  const previousChrome = global.chrome;
  const previousFetch = global.fetch;

  global.chrome = {
    runtime: {
      getURL(resourcePath) {
        return `chrome-extension://test-extension/${resourcePath}`;
      },
    },
  };
  global.fetch = async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      async json() {
        return {
          org: "org",
          route: "route",
          plan: [{ spots: ["spot"] }],
          members: [{ leader: true }],
          watcher: { name: "watcher" },
        };
      },
    };
  };

  try {
    for (const template of TEMPLATES) {
      await loadTemplate(template.id);
    }
  } finally {
    global.chrome = previousChrome;
    global.fetch = previousFetch;
  }

  assert.equal(requestedUrls.length, TEMPLATES.length);
  assert.ok(
    requestedUrls.every((url) => url.startsWith("chrome-extension://")),
  );
});

test("validation rejects missing required application data", () => {
  const valid = {
    org: "org",
    route: "route",
    plan: [{ spots: ["spot"] }],
    members: [{ leader: true }],
    watcher: { name: "watcher" },
  };

  for (const field of ["org", "route", "plan", "watcher"]) {
    const invalid = structuredClone(valid);
    delete invalid[field];
    assert.throws(() => validateTemplate(invalid), new RegExp(field, "i"));
  }

  assert.throws(
    () => validateTemplate({ ...valid, org: " " }),
    /org/i,
  );
  assert.throws(
    () => validateTemplate({ ...valid, route: "" }),
    /route/i,
  );
  assert.throws(
    () => validateTemplate({ ...valid, plan: [] }),
    /plan/i,
  );
  assert.throws(
    () => validateTemplate({ ...valid, watcher: {} }),
    /watcher/i,
  );
  assert.throws(
    () => validateTemplate({ ...valid, members: [] }),
    /exactly one leader/i,
  );
  assert.throws(
    () =>
      validateTemplate({
        ...valid,
        members: [{ leader: true }, { leader: true }],
      }),
    /exactly one leader/i,
  );
});
