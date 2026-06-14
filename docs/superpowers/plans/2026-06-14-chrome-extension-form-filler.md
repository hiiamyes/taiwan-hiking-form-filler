# Chrome Extension Form Filler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a loadable Manifest V3 Chrome extension whose popup starts one of the bundled hiking application templates and fills the official form through the final review/CAPTCHA page without submitting.

**Architecture:** Use a no-build extension under `extension/`. The popup sends a selected template ID to the background service worker, which stores a workflow session and opens a dedicated application tab. A content script resumes on every official-site page, detects the current form step, and runs a bounded page handler built on shared DOM helpers.

**Tech Stack:** Manifest V3, browser JavaScript, Chrome `storage.session` and `tabs` APIs, Node.js built-in test runner

---

## File Structure

- `extension/manifest.json`: permissions, popup, service worker, content scripts, and bundled template resources.
- `extension/popup.html`, `extension/popup.css`, `extension/popup.js`: one-click template buttons plus workflow status/reset.
- `extension/background.js`: starts and resets sessions, opens the dedicated application tab, and exposes state updates.
- `extension/content.js`: resumes the active session, detects the page, dispatches handlers, and records errors.
- `extension/lib/templates.js`: template catalog and validation.
- `extension/lib/workflow.js`: workflow phases and state transitions.
- `extension/lib/dom.js`: DOM querying, filling, selecting, checking, clicking, waiting, and text matching.
- `extension/lib/pages.js`: route, agreement, itinerary, people, and final-review detection/handlers.
- `extension/templates/*.json`: copies of the four canonical files currently under `applications/`.
- `test/templates.test.js`, `test/workflow.test.js`, `test/dom.test.js`, `test/pages.test.js`: focused Node tests.
- `README.md`: extension loading, usage, template maintenance, privacy, and stop-before-submit behavior.
- `package.json`: test script and DOM-test dependency.

### Task 1: Extension Shell And Bundled Templates

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Create: `extension/popup.js`
- Create: `extension/lib/templates.js`
- Create: `extension/templates/application.大劍兩天.json`
- Create: `extension/templates/application.奇萊主北兩天.json`
- Create: `extension/templates/application.桃山.json`
- Create: `extension/templates/application.玉山兩天.json`
- Create: `test/templates.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add a failing template-catalog test**

Create `test/templates.test.js` asserting that the catalog exposes four unique IDs, every template resolves to an extension URL, and validation rejects missing `org`, `route`, `plan`, leader, or watcher data.

- [ ] **Step 2: Run the template test and verify failure**

Run: `npm test -- test/templates.test.js`

Expected: FAIL because `extension/lib/templates.js` does not exist.

- [ ] **Step 3: Add the manifest, copy canonical templates, and implement the catalog**

Declare Manifest V3 permissions `storage` and `tabs`, host access only for `https://hike.taiwan.gov.tw/*`, and web-accessible JSON resources under `templates/`. Implement `TEMPLATES`, `loadTemplate(templateId)`, and `validateTemplate(data)`.

- [ ] **Step 4: Implement the one-click popup**

Render one button per `TEMPLATES` entry. On click, send `{ type: "START_APPLICATION", templateId }`. Render the current status and a reset button, with no summary screen and no separate start button.

- [ ] **Step 5: Run the template tests**

Run: `npm test -- test/templates.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json extension test/templates.test.js
git commit -m "feat: add extension shell and templates"
```

### Task 2: Workflow Session And Background Coordination

**Files:**
- Create: `extension/lib/workflow.js`
- Create: `extension/background.js`
- Create: `test/workflow.test.js`

- [ ] **Step 1: Add failing workflow-state tests**

Test `createSession(templateId, application)`, valid forward phase transitions, error transitions carrying `phase`, `action`, and `message`, and reset returning idle state.

- [ ] **Step 2: Run the workflow test and verify failure**

Run: `npm test -- test/workflow.test.js`

Expected: FAIL because `extension/lib/workflow.js` does not exist.

- [ ] **Step 3: Implement workflow state helpers**

Define phases `idle`, `starting`, `route`, `agreements`, `itinerary`, `people`, `final-review`, and `error`. Keep state serializable for `chrome.storage.session`.

- [ ] **Step 4: Implement the background service worker**

Handle `START_APPLICATION` by loading the selected bundled template, validating it, storing the session, and creating a dedicated tab at `https://hike.taiwan.gov.tw/apply_1.aspx`. Handle `GET_SESSION`, `UPDATE_SESSION`, and `RESET_SESSION`; never send a final-submit command.

- [ ] **Step 5: Run workflow tests**

Run: `npm test -- test/workflow.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add extension/background.js extension/lib/workflow.js test/workflow.test.js
git commit -m "feat: coordinate extension workflow sessions"
```

### Task 3: DOM Helpers And Page Detection

**Files:**
- Create: `extension/lib/dom.js`
- Create: `extension/lib/pages.js`
- Create: `test/dom.test.js`
- Create: `test/pages.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add a lightweight DOM test dependency**

Run: `npm install --save-dev jsdom`

Expected: `jsdom` appears in `devDependencies`.

- [ ] **Step 2: Add failing DOM-helper and detector tests**

Cover value setting with `input`/`change` events, option selection by value/label, checkbox checking, text lookup, bounded waits, and detection of route, agreements, itinerary, people, and final-review fixtures.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `npm test -- test/dom.test.js test/pages.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement DOM helpers and page detection**

Implement descriptive, bounded helpers. Detect final review from CAPTCHA/review controls before any other phase so the extension cannot advance past it.

- [ ] **Step 5: Run the focused tests**

Run: `npm test -- test/dom.test.js test/pages.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json extension/lib/dom.js extension/lib/pages.js test/dom.test.js test/pages.test.js
git commit -m "feat: add extension DOM and page detection"
```

### Task 4: Form Page Handlers And Content Script

**Files:**
- Modify: `extension/lib/pages.js`
- Create: `extension/content.js`
- Modify: `test/pages.test.js`

- [ ] **Step 1: Add failing page-handler fixture tests**

Add representative fixtures for Yushan, Taroko, and Shei-Pa variants. Assert handlers select the organization/route, check agreements, fill itinerary fields, populate leader/members/watcher, and stop at final review without clicking `#con_btnsave`.

- [ ] **Step 2: Run page-handler tests and verify failure**

Run: `npm test -- test/pages.test.js`

Expected: FAIL because handlers are not implemented.

- [ ] **Step 3: Implement bounded page handlers**

Port the behavior from `src/apply.js` into `handleRoute`, `handleAgreements`, `handleItinerary`, and `handlePeople`. Use explicit park variants and wait for dependent city/district and member controls before filling them.

- [ ] **Step 4: Implement content-script resume and error behavior**

Load the active session, ignore unrelated tabs, detect the current page, execute one handler, persist progress before navigation, and convert failures into the serializable error state. On final review, set `final-review` and perform no clicks.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add extension/content.js extension/lib/pages.js test/pages.test.js
git commit -m "feat: automate hiking application pages"
```

### Task 5: Documentation And End-To-End Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document extension setup and use**

Add instructions for loading `extension/` as an unpacked extension, clicking a bundled template, updating the canonical templates under `applications/` and their bundled copies, resetting an errored workflow, and manually completing CAPTCHA/submission.

- [ ] **Step 2: Verify the manifest and tests**

Run: `node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json')); console.log('manifest ok')"`

Expected: `manifest ok`.

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Manually verify in Chrome**

Load `extension/` unpacked, click one template, confirm a dedicated official-site tab opens, and confirm the extension stops on final review without clicking the final submit control. Record any official-site selector drift as a concrete error rather than bypassing it.

- [ ] **Step 4: Review final diff**

Run: `git diff --check`

Expected: no output.

Run: `git status --short`

Expected: only intentional extension, test, package, and README changes.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: explain chrome extension workflow"
```
