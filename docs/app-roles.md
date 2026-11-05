# App Roles

The app is **Fair Split**, a bill and tip splitter for small groups who share a meal, a taxi, or any other one-off bill and settle up afterwards.

It has two roles. They often use the same screen, but they come to it with opposite worries. The Bill Payer is worried about **being short-changed**. The Group Member is worried about **being overcharged**. A correct split has to satisfy both: the shares add up exactly to the total, and no share is more than one cent above any other.

---

## R-1 Bill Payer

A **Bill Payer** is the person in the group who paid the whole bill with their own card or cash, and now needs everyone else to pay them back. They are usually still at the table or just leaving, often on a phone, sometimes after a drink. They want an answer in seconds and will not double-check the arithmetic by hand.

**They can** enter the bill amount, choose a tip percentage, enter how many people are splitting, and see how much each person owes. They also see the full breakdown of bill, tip and total, and they can reset everything to start a new split.

**They must never** be shown shares that add up to less than the total they paid, even by one cent, because the missing amount would come out of their own pocket. They must never be shown a result based on input the app could not understand, such as text, a negative amount or zero people.

## R-2 Group Member

A **Group Member** is someone who did not pay at the venue and now owes the Bill Payer their share. They get an amount by message or by word of mouth, and may want to check it before they transfer money. They did not see the receipt being totalled, so they have no reason to trust a number on its own.

**They can** enter the same bill, tip and number of people, and see the same result with a breakdown: the bill, the tip and its percentage, the total, how many people pay which amount, and confirmation that the shares add up to the total.

**They must never** be charged more than an even share by more than one cent. When the total cannot be divided exactly, the leftover cents must be spread one cent at a time, not loaded onto one person.

---

### How the roles differ

| | Bill Payer | Group Member |
|---|---|---|
| Money direction | Is owed money | Owes money |
| Main risk | Getting back less than they paid | Paying more than their fair share |
| What they need from the result | One clear number per person, fast | A breakdown they can check |
| Invariant that protects them | Shares add up to exactly the total | No share is more than 1 cent above another |
