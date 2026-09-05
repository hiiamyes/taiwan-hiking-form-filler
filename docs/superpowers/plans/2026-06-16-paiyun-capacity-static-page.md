# Paiyun Capacity Static Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a v1 workflow that crawls Paiyun Lodge capacity on a cron schedule, stores the result on the filesystem, and exposes the latest data through a static HTML page in the `paaaack` website.

**Architecture:** Keep the crawler in `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler` as the data producer. Store timestamped JSON snapshots plus a stable `latest.json` file, then have `/Users/yes-houzz/codes/yes/paaaack` consume the exported JSON and render a static page. This v1 intentionally avoids a database, backend API, auth, and real-time crawling.

**Tech Stack:** Node.js, Playwright, cron, JSON files, static HTML or Next.js static route in `paaaack`.

---

## File Structure

### Crawler Repo: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler`

- Modify: `src/check-paiyun-capacity.js`
  - Add snapshot output support if it is not already present.
  - Keep existing `--output`, `--lock-file`, `--timeout-ms`, and `--retries` behavior.
- Create: `src/save-paiyun-capacity-snapshot.js`
  - Runs the crawler command or imports crawler helpers.
  - Writes both `data/paiyun-capacity/latest.json` and `data/paiyun-capacity/snapshots/<timestamp>.json`.
- Create: `test/paiyun-capacity-snapshot.test.js`
  - Tests latest-file writing, timestamped snapshot writing, and JSON shape.
- Modify: `README.md`
  - Document the cron command that writes both latest and snapshot files.

### Website Repo: `/Users/yes-houzz/codes/yes/paaaack`

- Create or modify: `apps/yeslee.me/public/paiyun-capacity/latest.json`
  - Static copy of the latest crawler output for the website.
- Create: `apps/yeslee.me/public/paiyun-capacity/index.html`
  - First-version static HTML page.
  - Reads no external API at runtime.
  - Displays fetched time, month sections, dates, status, remaining beds, queue, reviewing, approved, and occupied beds.
- Modify: `apps/yeslee.me/src/app/[locale]/HomePage.tsx`
  - Add a small link to the Paiyun capacity page only if discoverability is desired for v1.

---

## Data Contract

The crawler should produce this JSON shape:

```json
{
  "fetchedAt": "2026-06-16T03:06:12.986Z",
  "source": "https://hike.taiwan.gov.tw/bed_6.aspx",
  "hut": "排雲山莊",
  "months": [
    {
      "hut": "排雲山莊",
      "year": 2026,
      "month": 6,
      "capacity": {
        "weekdayBeds": 116,
        "holidayBeds": 116,
        "weekdayTents": 0,
        "holidayTents": 0
      },
      "days": [
        {
          "date": "2026-06-22",
          "weekday": "星期一",
          "status": "available",
          "remainingBeds": 7,
          "remainingTents": 0,
          "queue": 21,
          "reviewing": 22,
          "approved": 87,
          "occupiedBeds": 109,
          "occupiedTents": 0,
          "detailUrl": "https://hike.taiwan.gov.tw/bed_6main.aspx?node_id=3&sdate=2026-06-22",
          "text": "餘額 (7,0) 排隊預約 21 審核中 22 核准入園 87 (109,0)"
        }
      ]
    }
  ]
}
```

The website must treat missing numbers as `null`, not `0`. A `status` of `message` means the day has a site message instead of normal capacity data.

---

## Task 1: Snapshot Writer In Crawler Repo

**Files:**
- Create: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/src/save-paiyun-capacity-snapshot.js`
- Create: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/test/paiyun-capacity-snapshot.test.js`
- Modify: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/package.json`

- [ ] **Step 1: Write the failing test**

Create `test/paiyun-capacity-snapshot.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { saveSnapshotFiles, timestampForFilename } = require("../src/save-paiyun-capacity-snapshot");

test("timestampForFilename creates filesystem-safe UTC names", () => {
  assert.equal(timestampForFilename(new Date("2026-06-16T03:06:12.986Z")), "2026-06-16T030612Z");
});

test("saveSnapshotFiles writes latest and timestamped snapshot", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paiyun-snapshot-"));
  const payload = {
    fetchedAt: "2026-06-16T03:06:12.986Z",
    source: "https://hike.taiwan.gov.tw/bed_6.aspx",
    hut: "排雲山莊",
    months: [],
  };

  const result = saveSnapshotFiles(payload, {
    dataDir: dir,
    now: new Date("2026-06-16T03:06:12.986Z"),
  });

  assert.equal(result.latestPath, path.join(dir, "latest.json"));
  assert.equal(result.snapshotPath, path.join(dir, "snapshots", "2026-06-16T030612Z.json"));
  assert.deepEqual(JSON.parse(fs.readFileSync(result.latestPath, "utf8")), payload);
  assert.deepEqual(JSON.parse(fs.readFileSync(result.snapshotPath, "utf8")), payload);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/paiyun-capacity-snapshot.test.js
```

Expected: FAIL with `Cannot find module '../src/save-paiyun-capacity-snapshot'`.

- [ ] **Step 3: Implement snapshot writer**

Create `src/save-paiyun-capacity-snapshot.js`:

```js
const fs = require("node:fs");
const path = require("node:path");
const { writeJsonAtomic } = require("./check-paiyun-capacity");

const timestampForFilename = (date = new Date()) =>
  date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "");

const saveSnapshotFiles = (payload, { dataDir = "data/paiyun-capacity", now = new Date() } = {}) => {
  const latestPath = path.join(dataDir, "latest.json");
  const snapshotPath = path.join(dataDir, "snapshots", `${timestampForFilename(now)}.json`);

  fs.mkdirSync(path.dirname(latestPath), { recursive: true });
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  writeJsonAtomic(snapshotPath, payload, { pretty: true });
  writeJsonAtomic(latestPath, payload, { pretty: true });

  return { latestPath, snapshotPath };
};

module.exports = {
  saveSnapshotFiles,
  timestampForFilename,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test test/paiyun-capacity-snapshot.test.js
```

Expected: PASS.

- [ ] **Step 5: Add test to the main suite**

Modify `package.json` so the `test` script includes `test/paiyun-capacity-snapshot.test.js`:

```json
{
  "scripts": {
    "check:paiyun": "node src/check-paiyun-capacity.js",
    "test": "node --test test/background.test.js test/itinerary-step.test.js test/launcher.test.js test/paiyun-capacity.test.js test/paiyun-capacity-snapshot.test.js test/route-step.test.js test/routes.test.js",
    "test:live": "node --test test/route-step.live.test.js"
  }
}
```

- [ ] **Step 6: Run the full crawler repo test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

---

## Task 2: Cron Command For Latest Plus Snapshots

**Files:**
- Modify: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/README.md`
- Create: `/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/scripts/fetch-paiyun-capacity-cron.sh`

- [ ] **Step 1: Create a small cron shell wrapper**

Create `scripts/fetch-paiyun-capacity-cron.sh`:

```sh
#!/bin/sh
set -eu

ROOT="/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler"
cd "$ROOT"

mkdir -p data/paiyun-capacity logs tmp

/usr/bin/env node src/check-paiyun-capacity.js \
  --months 2 \
  --output data/paiyun-capacity/latest.json \
  --lock-file tmp/paiyun-capacity.lock \
  --timeout-ms 90000 \
  --retries 1 \
  --pretty

SNAPSHOT_NAME="$(/bin/date -u +%Y-%m-%dT%H%M%SZ)"
cp data/paiyun-capacity/latest.json "data/paiyun-capacity/snapshots/$SNAPSHOT_NAME.json"
```

- [ ] **Step 2: Make the wrapper executable**

Run:

```bash
chmod +x scripts/fetch-paiyun-capacity-cron.sh
```

Expected: command exits 0.

- [ ] **Step 3: Run the wrapper once manually**

Run:

```bash
scripts/fetch-paiyun-capacity-cron.sh
```

Expected:
- `data/paiyun-capacity/latest.json` exists.
- `data/paiyun-capacity/snapshots/<timestamp>.json` exists.
- `tmp/paiyun-capacity.lock` does not exist after the run.

- [ ] **Step 4: Document the cron entry**

Add this to `README.md` under the Paiyun cron section:

```cron
0 * * * * /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/scripts/fetch-paiyun-capacity-cron.sh 2>> /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/logs/paiyun-capacity.log
```

- [ ] **Step 5: Commit crawler cron support**

Run:

```bash
git add src/save-paiyun-capacity-snapshot.js test/paiyun-capacity-snapshot.test.js package.json README.md scripts/fetch-paiyun-capacity-cron.sh
git commit -m "feat: prepare Paiyun capacity snapshots for cron"
```

---

## Task 3: Static HTML Page In Paaaack

**Files:**
- Create: `/Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/public/paiyun-capacity/index.html`
- Create: `/Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/public/paiyun-capacity/latest.json`

- [ ] **Step 1: Copy the latest JSON into the website public folder**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
mkdir -p apps/yeslee.me/public/paiyun-capacity
cp /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/data/paiyun-capacity/latest.json apps/yeslee.me/public/paiyun-capacity/latest.json
```

Expected: `apps/yeslee.me/public/paiyun-capacity/latest.json` exists.

- [ ] **Step 2: Create static HTML**

Create `apps/yeslee.me/public/paiyun-capacity/index.html`:

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>排雲山莊床位餘額</title>
    <meta name="description" content="排雲山莊床位餘額查詢快照。" />
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #18201a;
        background: #f6f7f4;
      }
      main {
        max-width: 1040px;
        margin: 0 auto;
        padding: 24px 16px 48px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      .meta {
        color: #58605a;
        margin-bottom: 24px;
      }
      section {
        margin: 24px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border: 1px solid #dfe3dc;
      }
      th,
      td {
        padding: 10px 8px;
        border-bottom: 1px solid #edf0ea;
        text-align: left;
        font-size: 14px;
      }
      th {
        background: #e9eee6;
      }
      .available {
        color: #116329;
        font-weight: 700;
      }
      .full {
        color: #a12820;
        font-weight: 700;
      }
      .message {
        color: #6b5b12;
        font-weight: 700;
      }
      @media (max-width: 720px) {
        table {
          font-size: 13px;
        }
        th:nth-child(6),
        td:nth-child(6),
        th:nth-child(7),
        td:nth-child(7) {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>排雲山莊床位餘額</h1>
      <p id="meta" class="meta">載入中</p>
      <div id="content"></div>
    </main>
    <script>
      const statusText = {
        available: "有餘額",
        full: "額滿",
        message: "相關訊息",
        not_listed: "未列出",
      };

      const value = (input) => (input === null || input === undefined ? "-" : input);

      fetch("./latest.json", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          document.querySelector("#meta").textContent = `更新時間：${new Date(data.fetchedAt).toLocaleString("zh-TW")}｜來源：${data.source}`;
          document.querySelector("#content").innerHTML = data.months
            .map(
              (month) => `
                <section>
                  <h2>${month.year}-${String(month.month).padStart(2, "0")}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>狀態</th>
                        <th>餘床</th>
                        <th>排隊</th>
                        <th>審核中</th>
                        <th>核准</th>
                        <th>已占用</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${month.days
                        .filter((day) => day.status !== "not_listed")
                        .map(
                          (day) => `
                            <tr>
                              <td>${day.date} ${day.weekday || ""}</td>
                              <td class="${day.status}">${statusText[day.status] || day.status}</td>
                              <td>${value(day.remainingBeds)}</td>
                              <td>${value(day.queue)}</td>
                              <td>${value(day.reviewing)}</td>
                              <td>${value(day.approved)}</td>
                              <td>${value(day.occupiedBeds)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </section>
              `
            )
            .join("");
        })
        .catch(() => {
          document.querySelector("#meta").textContent = "無法載入資料";
        });
    </script>
  </body>
</html>
```

- [ ] **Step 3: Open the static page locally**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
open apps/yeslee.me/public/paiyun-capacity/index.html
```

Expected: browser displays the latest Paiyun capacity table.

- [ ] **Step 4: Commit website static page**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
git add apps/yeslee.me/public/paiyun-capacity
git commit -m "feat: add Paiyun capacity static page"
```

---

## Task 4: Manual Refresh Workflow Between Repos

**Files:**
- Create: `/Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/scripts/update-paiyun-capacity.sh`

- [ ] **Step 1: Create website-side copy script**

Create `apps/yeslee.me/scripts/update-paiyun-capacity.sh`:

```sh
#!/bin/sh
set -eu

SOURCE="/Users/yes-houzz/codes/yes/taiwan-hiking-form-filler/data/paiyun-capacity/latest.json"
TARGET="/Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/public/paiyun-capacity/latest.json"

mkdir -p "$(dirname "$TARGET")"
cp "$SOURCE" "$TARGET"
```

- [ ] **Step 2: Make it executable**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
chmod +x apps/yeslee.me/scripts/update-paiyun-capacity.sh
```

Expected: command exits 0.

- [ ] **Step 3: Run it once**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
apps/yeslee.me/scripts/update-paiyun-capacity.sh
```

Expected: `apps/yeslee.me/public/paiyun-capacity/latest.json` is updated from the crawler repo.

- [ ] **Step 4: Commit copy workflow**

Run from `/Users/yes-houzz/codes/yes/paaaack`:

```bash
git add apps/yeslee.me/scripts/update-paiyun-capacity.sh apps/yeslee.me/public/paiyun-capacity/latest.json
git commit -m "chore: add Paiyun capacity refresh script"
```

---

## Verification Checklist

- [ ] Crawler command exits 0:

```bash
cd /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler
npm run check:paiyun -- --months 1 --output /tmp/paiyun-capacity.json --lock-file /tmp/paiyun-capacity.lock --timeout-ms 90000 --retries 1
```

- [ ] Crawler tests pass:

```bash
cd /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler
npm test
```

- [ ] Static page opens from local file:

```bash
open /Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/public/paiyun-capacity/index.html
```

- [ ] Latest JSON can be parsed:

```bash
node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync("/Users/yes-houzz/codes/yes/paaaack/apps/yeslee.me/public/paiyun-capacity/latest.json","utf8")); console.log(data.hut, data.months.length)'
```

Expected output includes `排雲山莊` and a positive month count.

---

## V1 Non-Goals

- No database.
- No backend API.
- No user accounts.
- No notifications.
- No automatic deployment setup.
- No historical chart UI, even though snapshots make it possible later.
