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
| Check-in | / | Today · Meds · Reflect; Customize, Categories, Targets & scoring, Notifications, Account under the Settings gear |
| Habits | /routines | Rituals (run step by step), Set up habits & rituals, To-dos (one list grouped Today / This week / Later this month / Later / Someday / Done by date) |
| Projects (was Work) | /work | Today (3–5 picked tasks, timed ones on top, task timers; goals deck below; a goal opens its own page), Goals (goals → milestones → tasks, dependencies, progress, "Paste a plan from Claude") |
| Progress | /progress | Streaks & badges (check-in streak, 30-day tally, floor day, streak freezes, then per-area calendars), My progress (energy flow, then each project: % done, tasks this week vs usual, on track / late), Group |

Old addresses kstarr.com/challenge, /challenge-routines, /challenge-work, /challenge-progress **301-redirect** to the app (set in Webflow Site settings → Publishing). The old Webflow pages were renamed to `challenge-old`, `challenge-routines-old`, `challenge-work-old`, `challenge-progress-old` and kept as backups (still load from jsDelivr; not the main path any more).

Words: **habit** = one recurring action; **ritual** = a saved sequence of habits. Categories = the scored check-in questions.

## Status at hand-off
- Sep 29: Work start times + timers, bottom bar fix (check on iPhone that the bar stays put and a timer's push arrives).
- Done and live: rings, streaks on Progress, half units, the app at app.kstarr.com, notifications server, linked accounts, redirects.
- Waiting on people: Karla installs the app on her iPhone, turns on notifications and sends a test; Karla links hello@kstarr.com; Erik links mxfenrir@gmail.com (both may need to close and reopen the app once).

## Released Sep 29 (evening)
- **One app, no jumps:** all four pages are one bundle (`src/entries/app.js`); page links switch in place and remember each page's screen and scroll; the back gesture works. Redraws only change what's different (morphdom in `showScreen`), so taps don't replay animations, reset folds, or re-sweep the rings (areas marked `data-live` are left to their updater).
- **Settings** behind the gear (Customize, Categories, Targets & scoring, Notifications, Account); `src/layout.js` renames/hides pages, tabs and Today sections (Everything / Simple). Done returns to where you were.
- **Check-in** = Today · Meds · Reflect. Today: rings, "On your plate" (to-dos + Work/House tasks), meds, fold-up energy groups with points, "Close the day".
- **Breathing room** (`src/breathing.js`, `src/views/breathing.js`): pause any mix of categories, habits, goals for the rest of the week; asks how much room, what, why, and whether a smaller version would do. Words: only **on track / late / restarting after a break**. Paused things sit out of Today, rings, today's picks, the day's score (lead/floor too), streak calendars ("paused", neither breaks nor extends a run), momentum ("Paused"), the Habits page and ritual reminders. Taking/ending one republishes this week's group scores (`republishWeek`).
- **Projects goal screen** (Sep 30): a goal opens as its own screen sliding over the list (`.gpanel`, fixed, own scroll; the list keeps its place underneath; "‹ Projects" or the back gesture closes it; the installed app's bottom bar stays on top). One goal = one colour everywhere (deck card, disc, bar, milestone tabs — inactive tabs faded — task card); a goal with no milestones shows its task list with no folder tab.
- **Tidy up**: tasks >7 days late → push back / archive / done + why, logged in `slips`.
- **Welcome** for new people (`src/views/join.js`): three steps (simple or everything + name the projects page; what to track; privacy) instead of the rules page.
- Preview personas: `dist/preview-*.html` (you + Ada/Bea), `preview-rosa-*` (beta tester), `preview-new-*` (first visit).
- Code cleanup: `src/docs.js` read/edit for lists, `state.route` + `state.sheet`, timer read from the Work doc by the server. See HOW-IT-WORKS.

## Released Oct 1
- **Folding headings** on Check-in → Today: On your plate, Meds & substances, every category card and Close the day fold shut with a tap (`fold()` in components.js; remembered per device in pref `folded`).
- **Few-times-a-week habits** (e.g. Shower 3–4× a week; `perWeek`, optional `perWeekMax`): pace dots + "last X days ago" on the Habits page; "Habits due" on Check-in's On your plate only when it's been a while (gap ≥ 7/perWeek days) or the week is running out (`pace()` in src/routines.js). Phone nudge: Settings → Notifications → "Few-times-a-week habits" (default on, 6 pm; notify id `pace`; the server reads the last 14 days of `routinelog`).
- **Food log** in the Diet card (`src/food.js`, `src/views/food.js`): meals/snacks with name, rough calories, protein, hunger before eating (1–5); the meals' totals fill the day's calories and protein (scoring unchanged; with no meals you type totals as before). Star a meal = one-tap favorite (`settings.foods`, max 12). Water glasses and fruit & veg servings counters (targets `waterTarget` 8, `fvTarget` 5 in Targets & scoring); reaching the servings target ticks the fruit & veg goal. Rosa's preview shows it.
- **Edit forms scroll into view**: any inline edit form marked `data-open` (dose edit in Meds history, med/category/habit/ritual forms, to-do dates, meal form) is scrolled to when it opens off screen (`revealOpened()` in render.js).
- **Hiding a category never loses anything** (Oct 2): Categories → "Hide" moves the whole category into `settings.hiddenCats` (setup, level history, whether it was the streak/floor); "Hidden (answers kept)" → "+ Name" puts it back in place with the same id, so its past answers show again (`src/categories.js`). Answers are never deleted from days.
- **Meds tiles** (Oct 2): log buttons are squares, three across on phones, with a short status (`medStatus().short`); full status on long-press/title.
- **Bulk edit of logged doses**: Meds → History → "Edit several times": tick doses (or "Select all" per day), set one date and time, Save (`setLogsTime` in src/meds.js; doses unchanged; substance units move with the date).

## Released Oct 2
- Projects: "Goals" renamed Projects; milestones locked in order (per-project "any order" switch); archive / restore projects.
- Milestones stack vertically; Meds week chart + condensed dose history; Poster look (3rd theme); rituals can count toward a project and tick a task after N runs a week.

## Open questions for Karla
- Should Tidy up also cover to-dos with due dates (Habits page)?
- Retire the old Webflow backup pages (`challenge-*-old`) and stop building `dist/cdn/`? (Needs her OK: it's her public site.)
- Product trims she hasn't decided: fold to-dos into Work/House; move level-up habits to Habits; retire seasons / streak freezes / weekly points goal.

## Not wanted (for now)
- Sharing "tasks done today" with the group; season week on Group; rituals on the Check-in page.
