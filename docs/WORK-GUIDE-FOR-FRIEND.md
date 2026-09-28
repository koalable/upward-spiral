# Work page: how to add your goals

Your Work page is at **kstarr.com/challenge-work**. Sign in with your Google account. Everything on it is private to you.

## 1. Turn your plan into the app's format (2 minutes)

Open Claude and paste this whole prompt, then paste your plan underneath it (or describe your goal and ask Claude to write the plan):

```
Turn my plan into this exact format so I can paste it into my tracker. Rules:
- One goal per "GOAL:" line, with its final deadline.
- Break each goal into milestones (lines starting with "## "), roughly one per month, each with a due date.
- Under each milestone, list small concrete tasks (lines starting with "- "), each doable in one sitting (ideally under 3 hours), with a due date and a time estimate.
- If a task can't start until another is done, add "| after: <exact name of that task>".
- Dates as YYYY-MM-DD. No other text, no bold, no numbering.

Example:
GOAL: Book marketing launch | due 2027-09-30
## Build email list | due 2026-10-31
- Set up Substack welcome email | due 2026-10-05 | 2h
- Write lead magnet | due 2026-10-12 | 4h | after: Set up Substack welcome email
## Pitch podcasts | due 2026-11-30
- List 30 target podcasts | due 2026-11-07 | 3h

My plan:
[paste your plan here]
```

Tip: there's also a **Copy the prompt** button inside the app (Work → Goals → "Paste a plan from Claude").

## 2. Paste it into the app

1. Go to **Work → Goals**.
2. Open **Paste a plan from Claude**.
3. Paste Claude's whole answer into the box and tap **Import**.
4. The app tells you how many goals, milestones and tasks it added, and lists any lines it couldn't read.

## 3. Use it day to day

- **Work → Today** picks 3 tasks for you each day (you can switch to 4 or 5): overdue first, then whatever's due soonest.
- Tick a task when it's done. Unfinished tasks carry over to the next day.
- 📌 **Pin** keeps a task on today's list. 🔀 **Swap** trades it for the next one.
- Tasks that wait on another task (the "after:" part) stay hidden until that one's done.
- When today's list is done, tap **One more** if you want another.
- **Work → Goals** shows progress bars, days left, and **On track / Behind** (Behind = something is past its due date).
- Edit anything with the ✏️ button: rename, change dates, add or delete milestones and tasks. You never need Claude again unless you want a new plan.
- Your Work tasks also show on **Check-in → Today**, so the whole day is on one page.

## Format cheat sheet (if you want to write or fix it by hand)

```
GOAL: Goal name | due 2027-09-30
## Milestone name | due 2026-10-31
- Task name | due 2026-10-05 | 2h
- Another task | due 2026-10-12 | 90 min | after: Task name
```

- `GOAL:` starts a goal. `##` lines are milestones. `-` lines are tasks.
- Everything after the name is optional. Dates are YYYY-MM-DD.
- A task with no date takes its milestone's date.
- `after:` must match the other task's name exactly.
