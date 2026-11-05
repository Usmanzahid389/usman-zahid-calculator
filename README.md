# Fair Split: a bill and tip splitter

**Author:** Usman Zahid · **Repository:** https://github.com/Usmanzahid389/usman-zahid-calculator · **Live URL:** https://usman-zahid-calculator.vercel.app *(pending: not yet deployed and verified; see [Deployment](#deployment-vercel))*

Fair Split is a small web calculator that splits a shared bill and an optional tip between a group, **so that the shares always add up to exactly the total.**

## What it is and who it is for

When one person pays for a group meal or a taxi, two people have opposite worries:

- the **Bill Payer**, who paid and needs to get back every cent; and
- each **Group Member**, who owes money and wants to be sure they are not overcharged.

A plain calculator fails both of them. For example, $100 ÷ 3 = 33.33, and 3 × $33.33 = $99.99, so the payer quietly loses a cent. Fair Split works in whole cents and spreads the leftover cents one at a time: "1 person pays $33.34 and 2 people pay $33.33", with "Shares add up to $100.00" shown underneath. It also shows the bill, tip and total so a Group Member can check how their amount was reached.

**Why this calculator:** I chose a bill splitter over a general-purpose calculator for three reasons. It has real users with conflicting needs. It has one rule that can be checked precisely: the shares add up to the total and differ by at most 1 cent. And it has plenty of realistic error cases, such as zero people, negative or mistyped amounts, and totals too small to split. The scope stays small enough to specify completely.

The product documents are in [`docs/`](docs/):

1. [App Roles](docs/app-roles.md): who uses it
2. [Jobs To Be Done](docs/jobs-to-be-done.md): why they use it
3. [User Stories with Acceptance Criteria](docs/user-stories.md): what the app does, with the status of each story

## Prerequisites

- **Node.js 22.12 or later** (includes npm). Check your version with `node -v`. If you use nvm, run `nvm use`, which reads `.nvmrc`.
- A current version of Chrome, Edge, Firefox or Safari.

The app needs no accounts, API keys or network services, and it stores no data.

## Install and start

```bash
npm install
npm run dev
```

Then open the URL that Vite prints, normally **http://localhost:5173**.

Optional, to serve the production build:

```bash
npm run build
npm run preview      # usually http://localhost:4173
```

## Run the tests

```bash
npm test
```

There are 76 tests in three files under [`tests/`](tests/):

| File | What it covers |
|---|---|
| `stories.test.ts` | Every acceptance criterion in S-1 to S-8, named by story ID and checking the **exact** message text from the docs |
| `invariants.test.ts` | 20,000 seeded random inputs, plus the limits, confirming that the shares always add up to the total and differ by at most 1 cent; also tip rounding and money formatting |
| `ui.test.ts` | The real page in jsdom: carrying on after results and errors, Reset, Enter, `aria-invalid`, and no stale results |

`npm run typecheck` runs the TypeScript compiler in strict mode.

### Browser tests (Playwright, optional)

These tests use real browser engines. They start the dev server, type into the page one key at a time, click the tip options, and check the visible text against every acceptance criterion in S-1 to S-8. They also check Enter, Reset, keyboard-only use, and that the page doesn't scroll sideways at 320px wide.

```bash
npx playwright install chromium firefox webkit   # one-time browser download (~300 MB)
npm run test:e2e                                  # all browsers
npx playwright test --project=webkit              # one browser
```

Projects: `chromium`, `firefox`, `webkit` (Safari's engine), `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 14). There are 75 tests per project: S-1 to S-8 in [`e2e/stories.spec.ts`](e2e/stories.spec.ts), and phone and accessibility checks (S-12, S-13) in [`e2e/ui.spec.ts`](e2e/ui.spec.ts).

Results on my machine (macOS, Playwright 1.64.1):

| Project | Result |
|---|---|
| chromium | 75 passed |
| webkit | 74 passed, 1 skipped (Tab-key navigation; Safari doesn't tab to radios and buttons by default) |
| mobile-chrome | 72 passed, 3 skipped (keyboard-only tests; phones have no physical keyboard) |
| mobile-safari | 72 passed, 3 skipped (keyboard-only tests; phones have no physical keyboard) |
| firefox | **Not run automatically.** Playwright's Firefox build would not launch on this machine ("Could not find profile folder") before any test ran. Firefox was checked by hand instead and passed; see Manual testing. |

## How it works

```
src/
  lib/parse.ts     raw field text → cents / basis points / people, or the exact error message
  lib/split.ts     tip (half-up to the cent) and even split with leftover cents spread 1 by 1
  lib/format.ts    "$1,234.56", "12.5%", result sentences, breakdown lines
  lib/evaluate.ts  pure view model: which errors and which result to show for any form state
  ui/app.ts        DOM wiring; recalculates on every keystroke
  main.ts, style.css
index.html
tests/   unit and jsdom tests (Vitest)
e2e/     real-browser acceptance tests (Playwright)
```

Design decisions:

- **Integer cents everywhere.** Amounts are parsed from their digit strings, not with `parseFloat`, so float drift, `NaN`, `Infinity` and scientific notation can never reach the screen.
- **`type="text"` inputs with `inputmode`, not `type="number"`.** With a number input, Firefox and Safari report an empty value when someone types letters, which would make "Enter the bill as a number…" impossible to show. A text input lets the app see exactly what was typed, and `inputmode` still brings up the numeric keyboard on phones.
- **Live results with no Calculate button,** so a result can never be out of date. When any field is invalid, the previous result is removed.

## Deployment (Vercel)

The live URL is an extra. The app runs fully locally with the commands above. It's a static site, so all calculations happen in the browser, and it needs no server, environment variables or API keys.

[`vercel.json`](vercel.json) sets the framework to `vite`, the install command to `npm ci`, the build command to `npm run build` (type-check plus Vite build) and the output folder to `dist`. Vercel uses Node 22 because of the `engines` field in `package.json`.

One-time setup:

1. At https://vercel.com/new, import the GitHub repo `Usmanzahid389/usman-zahid-calculator`.
2. Set the project name to `usman-zahid-calculator` and keep the detected settings.
3. Click **Deploy**. The app is served at https://usman-zahid-calculator.vercel.app.

After that, every push to `main` deploys again automatically (user story S-14).

## AI tool and model

- **Tool:** Claude Code (VS Code extension)
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`)
- **Transcripts:** [`transcripts/`](transcripts/)

The product documents were drafted with the AI from my direction and reviewed by me.

## Code changed by hand

None so far. *(Any manual edit to code is listed here.)*

## Assumptions

- **One currency with 2 decimal places.** Amounts are shown with "$" and US-style thousands separators. The bill field accepts a leading `$`, surrounding spaces and comma thousands separators (`1,250.00`). A comma as a decimal mark (`12,5`) is rejected with a message rather than guessed at.
- **The bill amount already includes any tax,** as printed on the receipt. The tip is a percentage of that amount, rounded to the nearest cent with half a cent rounded up. The custom tip field also accepts a trailing `%` (`15%`).
- **Even split only.** Uneven splits based on what each person ordered are out of scope.
- **Limits:** the bill is from $0.01 to $1,000,000.00, the tip from 0% to 100% with at most 2 decimal places, and the number of people a whole number from 1 to 100. If the total is smaller than the number of people (fewer than 1 cent each), the app says so instead of showing $0.00 shares.
- **Leftover cents:** the app says *how many* people pay the extra cent. The group decides *who*.
- **Errors for empty fields** appear only after the user has typed in the field and cleared it, so a fresh page isn't covered in red.

## Manual testing

| Browser | How | Result |
|---|---|---|
| Firefox (desktop, macOS) | By hand against the acceptance criteria, at http://localhost:5173 | Passed |
| Chromium, WebKit (Safari engine), mobile Chrome, mobile Safari | Automated browser tests (see above) | Passed |

Not covered: a physical phone, and a real screen reader such as VoiceOver or NVDA.

## Status of user stories

| Story | Status |
|---|---|
| S-1 Split a bill evenly | Implemented |
| S-2 Add a tip as a percentage | Implemented |
| S-3 Shares always add up to the total | Implemented |
| S-4 See how the amount was reached | Implemented |
| S-5 Clear errors for an invalid bill amount | Implemented |
| S-6 Clear errors for an invalid number of people | Implemented |
| S-7 Clear errors for an invalid custom tip | Implemented |
| S-8 Carry on after a result or an error | Implemented |
| S-12 Use it on a phone at the table | Implemented |
| S-13 Use it with a keyboard or a screen reader | Implemented |
| S-14 Open it from a link, with nothing to install | Not implemented (deployment pending) |
| S-9 Send each person their amount | Not implemented |
| S-10 Add the tip as a fixed amount | Not implemented |
| S-11 Round shares up for cash | Not implemented |

The full acceptance criteria and how each story was verified are in [docs/user-stories.md](docs/user-stories.md).
