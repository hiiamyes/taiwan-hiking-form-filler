# taiwan-hiking-form-filler 🏔️

A CLI/script tool that auto-fills Taiwan National Park hiking permit application forms — saving you time, keystrokes, and typos.  
⚠️ **This tool does not submit the form or bypass the reCAPTCHA.**

## 🎥 Demo

👉 [Watch full demo video on YouTube](https://youtu.be/_c_niUu43xU)

[![Watch the demo video](./taiwan-hiking-form-filler-demo-2025-0504.png)](https://youtu.be/_c_niUu43xU)

---

## 🔍 What it does

This tool helps you auto-fill the long and repetitive hiking application forms on [https://hike.taiwan.gov.tw](https://hike.taiwan.gov.tw), especially useful for:

- Frequent hikers who apply regularly
- Group leaders filling out multiple teammate details
- Reducing typo-prone copy-paste workflows

---

## 🚫 What it **does NOT** do

- ❌ Does **not** submit the form
- ❌ Does **not** solve or bypass reCAPTCHA
- ❌ Does **not** guarantee acceptance from the park

You’ll still review, solve the CAPTCHA, and submit manually.

---

## 🛠️ How to use

> Requires Node.js (v20+)

### Install

```bash
git clone https://github.com/hiiamyes/taiwan-hiking-form-filler.git
cd taiwan-hiking-form-filler
npm i
npx playwright install
```

### Run form filler

```bash
cp src/application.sample.json src/application.json
node src/apply.js
```

### Check Yushan lodging capacity

This opens the Yushan lodging query page, reads every selectable hut/campsite
from the `宿營地` dropdown, and prints the capacity calendar for the current and
following month.

```bash
npm run check:yushan-capacity
```

Useful options:

```bash
node src/check-paiyun-capacity.js --months 3
node src/check-paiyun-capacity.js --json
node src/check-paiyun-capacity.js --output data/paiyun-capacity/latest.json
node src/check-paiyun-capacity.js --lock-file tmp/paiyun-capacity.lock
node src/check-paiyun-capacity.js --timeout-ms 90000 --retries 1
node src/check-paiyun-capacity.js --headful
```

`--json` is useful if you want to pipe the capacity data into another script.
`--output` writes a timestamped JSON payload atomically, so readers never see a
half-written file. `--lock-file` prevents overlapping scheduled runs.
`--headful` opens a visible browser window for debugging.

### Run as a cron job

Use absolute paths because cron runs with a small environment. This example
fetches every hour, writes JSON to `data/paiyun-capacity/latest.json`, and appends
errors to `logs/paiyun-capacity.log`.

```cron
0 * * * * cd /Users/yes-houzz/codes/yes/taiwan-hiking-form-filler && /usr/bin/env node src/check-paiyun-capacity.js --months 2 --output data/paiyun-capacity/latest.json --lock-file tmp/paiyun-capacity.lock --timeout-ms 90000 --retries 1 2>> logs/paiyun-capacity.log
```

Create the log directory before installing the cron entry:

```bash
mkdir -p logs
```

The output JSON has this shape:

```json
{
  "fetchedAt": "2026-06-16T02:30:00.000Z",
  "source": "https://hike.taiwan.gov.tw/bed_6.aspx",
  "park": "玉山",
  "targets": [
    {
      "id": "3",
      "name": "排雲山莊",
      "kind": "hut",
      "months": []
    }
  ]
}
```

### Verify changes

Run the offline test suite:

```bash
npm test
```

Check only the capacity parser test:

```bash
node --test test/paiyun-capacity.test.js
```

Check the script syntax:

```bash
node --check src/check-paiyun-capacity.js
```

Run a short live check against the hiking site:

```bash
npm run check:paiyun -- --months 1
```

Run a cron-style output check:

```bash
node src/check-paiyun-capacity.js --months 1 --output /tmp/yushan-capacity.json --lock-file /tmp/yushan-capacity.lock --timeout-ms 90000 --retries 1
```

## Chrome extension

The `extension/` directory is a direct Chrome-extension version of
`src/apply.js`.

1. Prepare a JSON file containing `watcher` and `members`.
2. Open `chrome://extensions`, enable **Developer mode**, and click
   **Load unpacked**.
3. Select the repository's `extension/` directory.
4. Click the extension icon, select a route, start date, and member JSON file,
   then click **Start** to open the hiking application in the current tab and
   start filling.

The selected date and imported member data are stored locally by the extension
and reused until they are changed or a new valid member file is imported.

The extension stops on the final review page. Review the form, enter the
CAPTCHA, and submit it manually.

If filling stops, the error message identifies the failed workflow step, the
reason, and the page URL.
