const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildResultPayload,
  parseArgs,
  parseCapacityTargetsHtml,
  parsePaiyunCapacityHtml,
  withLock,
  writeJsonAtomic,
} = require("../src/check-paiyun-capacity");

test("parses selectable capacity targets from the rooms dropdown", () => {
  const html = `
    <select id="con_rooms">
      <option value="">請選擇</option>
      <option value="3">排雲山莊</option>
      <option value="4">圓峰山屋/營地</option>
      <option value="221">荖濃溪營地</option>
    </select>`;

  assert.deepEqual(parseCapacityTargetsHtml(html), [
    { id: "3", name: "排雲山莊", kind: "hut" },
    { id: "4", name: "圓峰山屋/營地", kind: "mixed" },
    { id: "221", name: "荖濃溪營地", kind: "campsite" },
  ]);
});

test("parses Paiyun calendar capacity from saved page markup", () => {
  const html = `
    <select id="con_ddlYear"><option selected value="2026">2026</option></select>
    <select id="con_ddlMonth"><option selected value="7">7</option></select>
    <span id="con_generalnum">116</span>
    <span id="con_holidaynum">116</span>
    <span id="con_generalnumt">0</span>
    <span id="con_holidaynumt">0</span>
    <table class="table_bed">
      <tbody>
        <tr>
          <td data-th="星期三">
            <p>1</p>
            <p>
              <a href="bed_6main.aspx?node_id=3&sdate=2026-07-01">
                <span>餘額</span> (<span>1</span>,<span>0</span>)<br>
                <span>排隊預約</span> <span>67</span><br>
                <span>審核中</span> <span>1</span><br>
                <span>核准入園</span> <span>110</span><br>
                <span>(<span>115</span>,<span>0</span>)</span>
              </a>
            </p>
          </td>
          <td data-th="星期四">
            <p>2</p>
            <p>
              <a href="bed_6main.aspx?node_id=3&sdate=2026-07-02">
                <span>額滿</span><br>
                <span>排隊預約</span> <span>77</span><br>
                <span>審核中</span> <span>2</span><br>
                <span>核准入園</span> <span>111</span><br>
                <span>(<span>116</span>,<span>0</span>)</span>
              </a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>`;

  const month = parsePaiyunCapacityHtml(html, "https://hike.taiwan.gov.tw/bed_6.aspx");

  assert.equal(month.hut, "排雲山莊");
  assert.deepEqual(month.capacity, {
    weekdayBeds: 116,
    holidayBeds: 116,
    weekdayTents: 0,
    holidayTents: 0,
  });
  assert.deepEqual(month.days, [
    {
      date: "2026-07-01",
      weekday: "星期三",
      status: "available",
      remainingBeds: 1,
      remainingTents: 0,
      queue: 67,
      reviewing: 1,
      approved: 110,
      occupiedBeds: 115,
      occupiedTents: 0,
      detailUrl: "https://hike.taiwan.gov.tw/bed_6main.aspx?node_id=3&sdate=2026-07-01",
      text: "餘額 (1,0) 排隊預約 67 審核中 1 核准入園 110 (115,0)",
    },
    {
      date: "2026-07-02",
      weekday: "星期四",
      status: "full",
      remainingBeds: null,
      remainingTents: null,
      queue: 77,
      reviewing: 2,
      approved: 111,
      occupiedBeds: 116,
      occupiedTents: 0,
      detailUrl: "https://hike.taiwan.gov.tw/bed_6main.aspx?node_id=3&sdate=2026-07-02",
      text: "額滿 排隊預約 77 審核中 2 核准入園 111 (116,0)",
    },
  ]);
});

test("parses cron-friendly CLI options", () => {
  const options = parseArgs([
    "--months",
    "3",
    "--json",
    "--pretty",
    "--output",
    "data/paiyun-capacity.json",
    "--timeout-ms",
    "45000",
    "--retries",
    "2",
    "--lock-file",
    "tmp/paiyun-capacity.lock",
  ]);

  assert.deepEqual(options, {
    months: 3,
    headless: true,
    json: true,
    pretty: true,
    output: "data/paiyun-capacity.json",
    timeoutMs: 45000,
    retries: 2,
    lockFile: "tmp/paiyun-capacity.lock",
  });
});

test("builds a timestamped result payload for scheduled fetches", () => {
  const targets = [{ id: "3", name: "排雲山莊", kind: "hut", months: [{ hut: "排雲山莊", year: 2026, month: 7, days: [] }] }];
  const payload = buildResultPayload(targets, new Date("2026-06-16T02:30:00.000Z"));

  assert.deepEqual(payload, {
    fetchedAt: "2026-06-16T02:30:00.000Z",
    source: "https://hike.taiwan.gov.tw/bed_6.aspx",
    park: "玉山",
    targets,
  });
});

test("writes JSON output atomically and creates the parent directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paiyun-capacity-"));
  const output = path.join(dir, "nested", "paiyun.json");

  writeJsonAtomic(output, { ok: true }, { pretty: true });

  assert.equal(fs.readFileSync(output, "utf8"), '{\n  "ok": true\n}\n');
});

test("lock file prevents overlapping scheduled runs and cleans up", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paiyun-capacity-"));
  const lockFile = path.join(dir, "paiyun.lock");

  const value = await withLock(lockFile, async () => {
    assert.equal(fs.existsSync(lockFile), true);
    await assert.rejects(() => withLock(lockFile, async () => "overlap"), /Lock file already exists/);
    return "done";
  });

  assert.equal(value, "done");
  assert.equal(fs.existsSync(lockFile), false);
});
