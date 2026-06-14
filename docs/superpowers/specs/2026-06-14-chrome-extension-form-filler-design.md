# Chrome Extension Form Filler Design

## Goal

Build a Manifest V3 Chrome extension that lets the user select one of the
repository's predefined application templates, opens a dedicated Taiwan hiking
application tab, and automatically completes the same workflow as `src/apply.js`
until the final review and CAPTCHA page.

The extension must never solve CAPTCHA, click the final submit button, or submit
an application.

## User Flow

1. The user opens the extension popup.
2. The user clicks a bundled application template.
3. The extension opens a dedicated `https://hike.taiwan.gov.tw/apply_1.aspx`
   tab and progresses through the application pages.
4. The extension pauses if it encounters an error and exposes the failed step.
5. The extension stops on the final review and CAPTCHA page for manual review,
   CAPTCHA entry, and submission.

## Architecture

The extension lives under `extension/` and uses Manifest V3.

- The popup renders each bundled template as a one-click start action and owns
  reset and status display.
- A background service worker owns the workflow session, opens the dedicated
  application tab, tracks its tab ID, and coordinates navigation.
- A content script runs on `hike.taiwan.gov.tw`, detects the current application
  page, and delegates to a page-specific handler.
- Shared modules define application validation, workflow state, DOM helpers,
  and park-specific selectors.

The workflow is a state machine rather than one long-running script. Each page
handler performs one bounded step and stores progress before triggering
navigation. When the next page loads, the content script resumes from stored
state.

## Data And State

Bundled templates use the existing JSON schema from the samples in `src/`.
Required top-level data includes:

- `org`
- `route`
- `numOfDays`
- `startDate`
- `plan`
- `members`, including exactly one leader
- `watcher`

Optional data includes `teamName` and `destination`.

The selected bundled template, workflow progress, and errors are stored in
`chrome.storage.session`. This keeps the active application data out of
persistent extension storage and makes it available across page navigations.
Reset clears the session and closes no user tabs.

Workflow status uses these phases:

- `idle`
- `starting`
- `route`
- `agreements`
- `itinerary`
- `people`
- `final-review`
- `error`

The state also stores the dedicated tab ID, current handler detail, and a
human-readable error message.

## Page Handling

The content script detects pages from stable URL, form, and element signals.
It supports the variants already handled by `src/apply.js`:

- Yushan National Park
- Taroko National Park
- Other supported park forms, including Shei-Pa

Page handlers cover:

1. Selecting the park organization and route.
2. Checking applicable agreements and continuing.
3. Filling the team name, start date, number of days, itinerary spots, and
   optional destination.
4. Filling applicant/leader data, adding all non-leader members, and filling
   watcher data.
5. Navigating to the final review page.

Handlers use DOM selectors and events instead of Playwright APIs. DOM helpers
set input values, dispatch `input` and `change` events, select options, click
elements, wait for elements, and report descriptive failures.

The extension deliberately avoids clicking the final save/submit control.

## Error Handling

Every handler has a bounded timeout. Missing elements, invalid values, and
unexpected pages move the workflow to `error` instead of continuing blindly.

The error state includes:

- workflow phase
- attempted action
- a concise message

The popup shows the error and offers reset. It does not automatically retry
actions that may duplicate members or advance an application unexpectedly.

## Permissions And Privacy

The manifest requests only:

- `storage`
- `tabs`
- host access to `https://hike.taiwan.gov.tw/*`

No application data leaves the user's browser. The extension has no analytics,
remote API, CAPTCHA automation, or automatic final submission.

## Testing

Pure modules are tested with Node's built-in test runner:

- bundled template loading and validation
- workflow state transitions
- park/form variant selection

DOM helpers and page handlers are tested against representative HTML fixtures
using a lightweight DOM test environment. Manual verification loads the
unpacked extension, clicks a bundled template, and confirms that automation
stops on the final review/CAPTCHA page without submitting.

## Documentation

The README will document:

- how to load the unpacked extension
- how to select and maintain bundled application templates
- the stop-before-submit behavior
- troubleshooting when the official website changes
