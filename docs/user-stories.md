# User Stories with Acceptance Criteria

Each story names the job it serves (see [jobs-to-be-done.md](jobs-to-be-done.md)). Each job names its role (see [app-roles.md](app-roles.md)).

**Status** is what the running app does today.

| Story | Status | How it was verified |
|---|---|---|
| S-1 to S-8 | Implemented | Unit tests (Vitest), browser tests in Chromium, WebKit, mobile Chrome and mobile Safari (Playwright), and a manual check in Firefox |
| S-12 | Implemented | Browser tests at 320px and on phone-sized screens, and a manual check in Firefox. The number keyboard was checked through the `inputmode` attribute; it was not tried on a physical phone |
| S-13 | Implemented | Browser tests and a manual check in Firefox. Not tested with a real screen reader; names, descriptions and the live region were checked through the accessibility tree |
| S-14 | Not implemented | Waiting for the Vercel deployment to be created and checked at the public URL |
| S-9, S-10, S-11 | Not implemented | Next to build |

## Shared rules used by the criteria

- **Starting state:** the bill amount is empty, the tip is set to **No tip (0%)**, and the number of people is **2**. The result area shows "Enter the bill amount to see the split."
- **Live results:** the result updates as the user types. There is no Calculate button.
- **Untouched vs. cleared:** a field that is still empty from the start shows no error message. A field the user typed in and then cleared shows an "Enter …" error.
- **No stale results:** whenever any field is invalid, no split is shown. The result area shows "Fix the highlighted fields to see the split."
- **Money:** amounts are in a currency with 2 decimal places and are shown with a "$" sign and thousands separators, for example $1,250.00. All arithmetic uses whole cents, so floating-point rounding never applies.
- **Tip rounding:** the tip is rounded to the nearest cent, with half a cent rounded up.
- **Limits:** the bill can be from $0.01 to $1,000,000.00. The tip can be from 0% to 100% with at most 2 decimal places. The number of people can be any whole number from 1 to 100.

---

## S-1 Split a bill evenly (serves J-1). Status: Implemented

> As a **Bill Payer**, I want to enter the bill amount and the number of people and see what each person owes, so that I can tell everyone their share straight away.

- Given the starting state, when I enter bill `90` and people `3`, then I see "Each person pays $30.00".
- Given people is `2`, when I enter bill `84.50`, then I see "Each person pays $42.25".
- Given bill is `90`, when I enter people `1`, then I see "1 person pays $90.00".
- Given people is `2`, when I enter bill `$84.50` (with a leading dollar sign), then I see "Each person pays $42.25".
- Given people is `2`, when I enter bill ` 84.50 ` (with spaces before and after), then I see "Each person pays $42.25".
- Given people is `2`, when I enter bill `1,250.00` (with a thousands separator), then I see "Each person pays $625.00".
- Given people is `2`, when I enter bill `.50`, then I see "Each person pays $0.25".
- Given people is `2`, when I enter bill `12.` (ending in a dot), then I see "Each person pays $6.00".
- Given bill is `1` and people is `100` (the maximum), then I see "Each person pays $0.01".
- Given bill is `1000000` (the maximum) and people is `2`, then I see "Each person pays $500,000.00".

## S-2 Add a tip as a percentage (serves J-2). Status: Implemented

> As a **Bill Payer**, I want to add a tip as a percentage of the bill, so that the tip is shared along with the bill instead of falling on me.

- Given the starting state, then the tip options are **No tip**, **10%**, **15%**, **20%** and **Custom**, and **No tip** is selected.
- Given bill `100` and people `2`, when I select **15%**, then I see "Each person pays $57.50".
- Given bill `100`, people `2` and **15%** selected, when I select **20%**, then the result changes to "Each person pays $60.00" without any other action.
- Given bill `33.33` and people `1`, when I select **15%**, then the tip is $5.00 (499.95 cents rounded up) and I see "1 person pays $38.33".
- Given bill `80` and people `1`, when I select **Custom** and enter `12.5`, then I see "1 person pays $90.00".
- Given bill `50` and people `1`, when I select **Custom** and enter `100` (the maximum), then I see "1 person pays $100.00".
- Given bill `50` and people `1`, when I select **Custom** and enter `0`, then I see "1 person pays $50.00".
- Given I select **Custom** and have not typed in the custom field, then no tip error is shown and the result area shows "Enter a tip percentage to see the split."
- Given **Custom** is selected with `12.5`, when I select **10%**, then the custom value is ignored and the result uses 10%.

## S-3 Shares always add up to the total (serves J-1). Status: Implemented

> As a **Bill Payer**, I want the shares to add up to exactly the total when it does not divide evenly, so that I am never left a few cents short.

- Given no tip, when I enter bill `100` and people `3`, then I see "1 person pays $33.34 and 2 people pay $33.33" and "Shares add up to $100.00".
- Given no tip, when I enter bill `100` and people `6`, then I see "4 people pay $16.67 and 2 people pay $16.66" and "Shares add up to $100.00".
- Given **15%** tip, when I enter bill `10` and people `3`, then I see "1 person pays $3.84 and 2 people pay $3.83" and "Shares add up to $11.50".
- Given **Custom** tip `100`, when I enter bill `1000000` and people `3`, then I see "2 people pay $666,666.67 and 1 person pays $666,666.66" and "Shares add up to $2,000,000.00".
- Given any valid bill, tip and number of people, then the shares shown always add up to exactly the total, and no share differs from another by more than $0.01.
- Given no tip, when I enter bill `0.03` and people `3`, then I see "Each person pays $0.01".
- Given no tip, when I enter bill `0.02` and people `3`, then I see "The total of $0.02 is too small to split between 3 people. Each person must pay at least $0.01." and no split is shown.

## S-4 See how the amount was reached (serves J-4). Status: Implemented

> As a **Group Member**, I want to see the bill, the tip and the total behind my share, so that I can check I am not being overcharged before I pay.

- Given bill `100`, **15%** tip and people `2`, then I see the lines "Bill $100.00", "Tip (15%) $15.00", "Total $115.00" and "Shares add up to $115.00".
- Given bill `80`, **Custom** tip `12.5` and people `1`, then I see "Tip (12.5%) $10.00".
- Given bill `90`, **No tip** and people `3`, then I see "Tip (0%) $0.00" and "Total $90.00".
- Given any field is invalid, then no breakdown is shown.

## S-5 Clear errors for an invalid bill amount (serves J-3). Status: Implemented

> As a **Bill Payer**, I want a clear message when the bill amount I typed cannot be used, so that I never send people a split based on a mistyped figure.

- Given people `2`, when I enter bill `abc`, then I see "Enter the bill as a number, for example 84.50." next to the bill field, and the result area shows "Fix the highlighted fields to see the split."
- Given people `2`, when I enter bill `12abc`, `1e5` or `12,5`, then I see "Enter the bill as a number, for example 84.50." each time.
- Given people `2`, when I enter bill `-20`, then I see "The bill amount can't be negative."
- Given people `2`, when I enter bill `0` or `0.00`, then I see "The bill amount must be more than 0."
- Given people `2`, when I enter bill `12.345`, then I see "The bill amount can have at most 2 decimal places."
- Given people `2`, when I enter bill `1000000.01`, then I see "The bill amount must be 1,000,000.00 or less."
- Given people `2`, when I enter bill `99999999999999999999` (20 digits), then I see "The bill amount must be 1,000,000.00 or less." The page does not show "Infinity", "NaN", scientific notation or a rounded wrong value.
- Given I typed `50` in the bill field, when I delete it so the field is empty, then I see "Enter the bill amount."
- Given the bill field shows an error, then the field is marked as invalid for assistive technology (`aria-invalid="true"`) and the message is linked to the field, so a screen reader announces it.

## S-6 Clear errors for an invalid number of people (serves J-3). Status: Implemented

> As a **Bill Payer**, I want a clear message when the number of people I typed makes no sense, so that I never split a bill between zero, negative or fractional people.

- Given bill `90`, when I enter people `0`, then I see "There must be at least 1 person." and no split is shown.
- Given bill `90`, when I enter people `-2`, then I see "There must be at least 1 person."
- Given bill `90`, when I enter people `2.5`, then I see "Enter the number of people as a whole number, for example 4."
- Given bill `90`, when I enter people `two` or `1e2`, then I see "Enter the number of people as a whole number, for example 4."
- Given bill `90`, when I enter people `101`, then I see "The number of people must be 100 or fewer."
- Given bill `90`, when I enter people `100`, then no error is shown and I see "Each person pays $0.90".
- Given bill `90`, when I clear the people field, then I see "Enter the number of people."

## S-7 Clear errors for an invalid custom tip (serves J-3). Status: Implemented

> As a **Bill Payer**, I want a clear message when the custom tip I typed cannot be used, so that I do not overcharge or undercharge the group by mistake.

- Given bill `100`, people `2` and **Custom** selected, when I enter `-5`, then I see "The tip can't be negative." and no split is shown.
- Given the same, when I enter `150`, then I see "The tip must be 100% or less."
- Given the same, when I enter `abc`, then I see "Enter the tip as a number, for example 15."
- Given the same, when I enter `12.345`, then I see "The tip can have at most 2 decimal places."
- Given the same, when I enter `15` and then clear the custom field, then I see "Enter a tip percentage."
- Given the custom tip field shows an error, when I select a preset such as **15%**, then the tip error disappears and the result uses 15%.

## S-8 Carry on after a result or an error (serves J-3). Status: Implemented

> As a **Bill Payer**, I want to correct or change any figure and see the result update straight away, so that fixing a mistake never means starting over.

- Given the result "1 person pays $33.34 and 2 people pay $33.33" (bill `100`, people `3`), when I change people to `4`, then the result changes to "Each person pays $25.00" without any other action.
- Given a valid result is shown, when I change the bill to `abc`, then the previous result is removed and the result area shows "Fix the highlighted fields to see the split."
- Given people `0` shows "There must be at least 1 person.", when I change people to `4`, then the error disappears and, with bill `100`, I see "Each person pays $25.00".
- Given bill `abc` and people `0`, then both error messages are shown at the same time.
- Given bill `abc` and people `0`, when I fix only the bill, then the people error is still shown and no split is shown.
- Given any field shows an error, then the values in the other fields are kept exactly as I typed them.
- Given any combination of values and errors, when I press **Reset**, then the bill is empty, the tip is **No tip**, people is `2`, no errors are shown, and the result area shows "Enter the bill amount to see the split."
- Given I am typing in any field, when I press Enter, then the page does not reload and no values are lost.

## S-12 Use it on a phone at the table (serves J-1). Status: Implemented

> As a **Bill Payer**, I want the calculator to fit my phone's screen and bring up a number keyboard, so that I can split the bill before everyone leaves the table.

- Given a screen 320px wide, when the page loads, then it fits the width with no sideways scrolling, and every field, tip option, the Reset button and the result can be reached by scrolling down only.
- Given a screen 320px wide, when I enter bill `99999999999999999999`, then the error message wraps onto more lines and the page still does not scroll sideways.
- Given a screen 320px wide, bill `1000000`, Custom tip `100` and people `3`, then the result "2 people pay $666,666.67 and 1 person pays $666,666.66" wraps and the page does not scroll sideways.
- Given a phone, when I tap the bill field or the custom tip field, then the keyboard shown is a decimal number keyboard (`inputmode="decimal"`). When I tap the people field, it is a whole-number keyboard (`inputmode="numeric"`).
- Given a phone, then every tip option, every text field and the Reset button is at least 44px tall, so each can be tapped without hitting its neighbour.

## S-13 Use it with a keyboard or a screen reader (serves J-3). Status: Implemented

> As a **Bill Payer** who uses a keyboard or a screen reader, I want every control to be reachable, named and announced, so that I can split a bill and notice mistakes without using a mouse or seeing the screen.

- Given the page, then the fields have the accessible names "Bill amount", "Number of people" and "Custom tip (%)", and the tip options are a group named "Tip" containing radio buttons named "No tip", "10%", "15%", "20%" and "Custom".
- Given focus is in the bill field, when I press Tab, then focus moves to the tip options. Arrow keys change the selected tip and update the result. Tab then moves to the people field and then to Reset. *(In Safari, reaching radio buttons and buttons with Tab requires the system setting "Press Tab to highlight each item".)*
- Given any control has keyboard focus, then a visible focus outline at least 2px wide in the accent colour is drawn around it.
- Given I select **Custom**, then focus moves to the custom tip field.
- Given the result changes, then the new text is in a live region (`aria-live="polite"`), so a screen reader announces it without the user moving focus.
- Given a field shows an error, then the field is marked `aria-invalid="true"` and the error is its accessible description (as in S-5).

## S-14 Open it from a link, with nothing to install (serves J-4). Status: Not implemented

> As a **Group Member**, I want to open the calculator from a link someone sends me, so that I can check my share on my own phone before I pay, without installing anything or creating an account.

- Given the public URL https://usman-zahid-calculator.vercel.app, when I open it in a current version of Chrome, Edge, Firefox or Safari, then the page "Fair Split" loads over HTTPS without asking me to sign in or install anything.
- Given the public URL is open, when I enter bill `100` and people `3`, then I see "1 person pays $33.34 and 2 people pay $33.33" and "Shares add up to $100.00", exactly as in the local app (S-3).
- Given the public URL is open, when I enter bill `abc`, then I see "Enter the bill as a number, for example 84.50." (S-5). Validation works the same online as locally.
- Given the public URL is open on a phone, then the page fits the screen with no sideways scrolling (S-12).
- Given the page has loaded, when the network connection drops, then calculating still works, because every calculation runs in the browser and nothing is sent to a server.
- Given new code is pushed to the `main` branch of https://github.com/Usmanzahid389/usman-zahid-calculator, when the deployment finishes, then the public URL serves the new version. If the build fails, the previous version stays online.

---

## Next to build

## S-9 Send each person their amount (serves J-1). Status: Not implemented

> As a **Bill Payer**, I want to copy a short summary of the split, so that I can paste it into the group chat without retyping the numbers.

- Given a valid result for bill `100`, people `3` and no tip, when I press **Copy summary**, then the clipboard contains "Bill $100.00 + tip (0%) $0.00 = $100.00, split 3 ways: 1 person pays $33.34, 2 people pay $33.33." and I see "Copied".
- Given any field is invalid, then **Copy summary** is disabled.
- Given the browser blocks clipboard access, when I press **Copy summary**, then I see "Couldn't copy. Select the text and copy it manually." and the summary text is shown selected.

## S-10 Add the tip as a fixed amount (serves J-2). Status: Not implemented

> As a **Bill Payer**, I want to enter the tip as a fixed amount instead of a percentage, so that I can match what the group actually agreed to leave.

- Given bill `100` and people `2`, when I choose a fixed tip and enter `12`, then I see "Tip $12.00", "Total $112.00" and "Each person pays $56.00".
- Given a fixed tip, when I enter `-1`, then I see "The tip can't be negative."

## S-11 Round shares up for cash (serves J-1). Status: Not implemented

> As a **Bill Payer**, I want to round each share up to a whole dollar, so that collecting cash is easy and I am never short.

- Given bill `100`, people `3` and rounding up turned on, then I see "Each person pays $34.00" and "You collect $102.00, $2.00 more than the total."
- Given a total that already divides into whole dollars, such as bill `90` and people `3`, then I see "Each person pays $30.00" and no extra is shown.
