# Upward Spiral of Awesomeness: handoff for a new chat

Last updated Sep 29, 2026. Read this first; the reference for code, design, data and notifications is `docs/HOW-IT-WORKS.md`.

## How Karla wants to work
- Run ideas and details by her **before** building. Keep answers short and plain (non-technical).
- Anything touching permissions, keys, billing or publishing her public site: she clicks it herself; guide her.

## What it is
A private habit app for three people on **app.kstarr.com** (Firebase Hosting), installable on a phone's home screen, with Google sign-in, Firestore and push notifications.

People (all on the member list in `firestore.rules`):
- Karla: karlastarr@gmail.com (main) + hello@kstarr.com (linked)
- Erik: erikjschultz@gmail.com (main) + mxfenrir@gmail.com (linked)
- Mom: ssstarr29@gmail.com

| Page | App URL | Tabs |
|---|---|---|
| Check-in | / | Today, Meds, Journal, Categories, Targets & rules, Notifications (live). On the branch: Today · Meds · Reflect, with the rest under the Settings gear |
| Habits | /routines | Rituals (run step by step), Set up habits, To-dos (one list grouped Today / This week / Later this month / Later / Someday / Done by date) |
| Work | /work | Today (3–5 picked tasks, timed ones on top, task timers; goals deck below; a goal opens its own page), Goals (goals → milestones → tasks, dependencies, progress, "Paste a plan from Claude") |
| Progress | /progress | Streaks & badges (check-in streak, 30-day tally, floor day, streak freezes, then per-area calendars), My progress (energy flow), Group |

Old addresses kstarr.com/challenge, /challenge-routines, /challenge-work, /challenge-progress **301-redirect** to the app (set in Webflow Site settings → Publishing). The old Webflow pages were renamed to `challenge-old`, `challenge-routines-old`, `challenge-work-old`, `challenge-progress-old` and kept as backups (still load from jsDelivr; not the main path any more).

Words: **habit** = one recurring action; **ritual** = a saved sequence of habits. Categories = the scored check-in questions.

## Status at hand-off
- Sep 29: Work start times + timers, bottom bar fix (check on iPhone that the bar stays put and a timer's push arrives).
- Done and live: rings, streaks on Progress, half units, the app at app.kstarr.com, notifications server, linked accounts, redirects.
- Waiting on people: Karla installs the app on her iPhone, turns on notifications and sends a test; Karla links hello@kstarr.com; Erik links mxfenrir@gmail.com (both may need to close and reopen the app once).

## In progress (branch `checkin-reshuffle`, not released; preview only)
- Sep 29 cleanup done on this branch: shared list load/save (`src/docs.js`), route + one open-sheet slot, timer read from the Work doc, old in-browser med alerts and calendar-reminder code removed, Check-in bundle ~24% smaller, dead styles removed. See HOW-IT-WORKS → How the code fits together.
- Settings behind a gear (Customize, Categories, Targets & scoring, Notifications, Account); `src/layout.js` renames/hides pages, tabs and Today sections (Everything / Simple presets).
- Check-in = Today · Meds · Reflect. Today: rings, "On your plate" (to-dos + Work/House tasks), meds, fold-up energy groups with points, "Close the day".
- **Breathing room** (`src/breathing.js`, `src/views/breathing.js`): pause any mix of categories, habits, goals for the rest of the week; asks how much room, what, why, and whether a smaller version would do. Language is only **on track / late / restarting after a break** (Karla: no "making it up"). Late goals can move this week's tasks to next week. Paused things leave Today, rings and today's picks. Still to do: streaks/momentum/calendars treat paused days as paused; habits page and notifications skip paused habits.
- **Tidy up** (Work → Today, plus a line on Check-in's On your plate): tasks more than 7 days late, one at a time → Push back (+1/+2 weeks/date) / Archive / Already done, then Why? (+ note). Logged in the work doc's `slips` (task, goal, days late, action, why, note, from/to) for behaviour data later; archived tasks move to `archived`. Logic: `staleTasks`, `resolveStale` in `src/work.js`.
- Rosa (pretend beta tester) in `dist/preview-rosa-*.html` (`seedRosa` in `src/preview.js`).

## Open questions for Karla
- Should Tidy up also cover to-dos with due dates (Habits page)?
- Retire the old Webflow backup pages (`challenge-*-old`) and stop building `dist/cdn/`? (Needs her OK: it's her public site.)
- Product trims she hasn't decided: fold to-dos into Work/House; move level-up habits to Habits; retire seasons / streak freezes / weekly points goal.

## Not wanted (for now)
- Sharing "tasks done today" with the group; season week on Group; rituals on the Check-in page.
