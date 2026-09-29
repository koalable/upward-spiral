# Upward Spiral of Awesomeness: handoff for a new chat

Last updated Sep 28, 2026 (day rings). Read this first, then `README.md` in the repo.

## How Karla wants to work
- Run ideas and details by her **before** building. Keep answers short and plain (non-technical).
- Don't paste or re-save the Webflow head/footer code on releases.

## What it is
A private habit app for three people (karlastarr@gmail.com, erikjschultz@gmail.com, ssstarr29@gmail.com) on kstarr.com, built with Webflow pages, Firebase Google sign-in and Firestore.

| Page | URL | Tabs |
|---|---|---|
| Check-in | /challenge | Today (just that day: progress rings, to-dos + Work tasks, then the check-in), Meds, Journal, Categories, Targets & rules |
| Habits | /challenge-routines | Rituals (run step by step), Set up habits, To-dos |
| Work | /challenge-work | Today (3–5 picked tasks), Goals (goals → milestones → tasks, dependencies, progress, "Paste a plan from Claude") |
| Progress | /challenge-progress | Streaks & badges (check-in streak, 30-day tally, floor day, streak freezes, then per-area calendars), My progress (energy flow), Group |

Words: **habit** = one recurring action; **ritual** = a saved sequence of habits. Categories = the scored check-in questions.

## Design (approved)
- shadcn-style dark UI plus cream light mode; Inter for text, Instrument Serif for headings and big numbers; Lucide icons.
- **Energy flow** groups, used the same way on every page:
  - Fill up / Garden (green): sleep, diet, healthy practices
  - Protect / Tide (blue): substances, screen time
  - Spend well / Ember (orange): writing, reading, movement
  - Show up / Dusk (violet): check-ins, habits, rituals
- Tile **shade = momentum**. This week is compared with the average of the 3 weeks before, on the same days so far: >20% up is surging, 5–20% up rising, within 5% steady, 5–20% down dipping, >20% down slipping. Tiles keep a slight tilt.
- Work goals each get their own colour (blue, rose, green, gold, violet, teal, orange). Their tasks carry a matching stripe.
- Check-in → Today opens with the **day's rings** (`src/rings.js`, `src/views/rings.js`): one ring per energy group, each starting as a labelled tab (icon, name, points) that curls around the centre. Fill up / Protect / Spend well = check-in points in that group. Show up = finishing the check-in + habits due today + today's Work tasks (+ any Show up questions). Centre = average of the rings, with day points underneath. Rings sweep in, update live, turn deep with a check when full; all full shows a celebration. Tapping a tab jumps to that group.
- Everything streak-related lives on Progress → Streaks & badges (streak count, freezes and the freeze button, red missed-day lines, floor day, never-miss-twice note). Check-in has no streak info and no banners.

## Code and deploy
- Source: GitHub **koalable/upward-spiral** (public). `src/` holds the code and `node build.mjs` builds `dist/cdn/*`. Run tests with `node --test test/*.test.js`.
- Webflow pages load `https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/<page>.js` plus `app.css`. The setup is in `WEBFLOW-SETUP.md`.
- **Release:** build → commit and push → open `https://purge.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/<file>` for each changed file (app.css, checkin.js, routines.js, work.js, progress.js). There are no Webflow edits and no republishing.
- Webflow IDs:
  - site 6933d4ae2e861d77f0889941
  - domains 6961cc3839f05b214290ff75 and 6961cc3739f05b214290ff65
  - pages: checkin 6aadf10cdfca7bb48ab485f5, routines 6ab9cc27b34bf1ccbfbe8156, work 6aba1c3cafaa8c16e9abf6b6, progress 6ab9cc2781d40ecb770f6786
- Firebase project: upward-spiral-of-awesomeness. Rules are in `firestore.rules`; Karla pastes them into Firebase herself.

## Data (Firestore, private per person under users/{uid})
- `days/{date}` holds check-in answers.
- `goals/d<date>|w<week>|m<month>` holds to-dos.
- `lists/routines` holds habits and rituals.
- `routinelog/{date}` records which habits were done.
- `lists/work` holds goals, milestones, tasks, today's pins and swaps, and tasks per day.
- Shared: members, scores, wins, and config/season.

## Open items / ideas
- The Check-in dashboard could also show today's rituals with Start buttons (offered, not asked for yet).
- Sharing "tasks done today" with the group: off, not built. It needs a Firestore rules change.
- The season week ("Season 1, week 2 of 6") was removed from Check-in. It could go on the Group tab if wanted.
- **Home-screen app (in progress):** agreed plan = installable web app on Firebase Hosting at **app.kstarr.com** (Karla OK'd the domain, the pay-as-you-go plan with a card, and the app for all three). Built: `app/` output from `build.mjs`, icons (`app-src/`), service worker, bottom tab bar in standalone mode, redirect sign-in, deploy workflow. Setup steps she still has to do: `docs/APP-SETUP.md`.
- **Notifications (built):** Check-in → Notifications tab. Each person turns them on per device (installed app only) and picks: check-in reminder (time), ritual start (ritual times), meds (med times), Work morning list (time, off by default), streak saver (time), quiet hours. Choices in `users/{uid}/notify/settings`. Planner is pure `src/notify.js` (tested); server `functions/src/index.js` (`notifyTick` every 15 min, `sendTest` callable), bundled to `functions/index.js` by build.mjs and deployed by the same workflow. Web push key (public) is `VAPID_KEY` in build.mjs.
- Not wanted: sharing tasks with the group; season week on Group; rituals on Check-in (for now).
- Substances accept half units: a med can count as 1 or ½ unit per log; the stepper moves by ½; up to 1 unit over the limit earns 2.
- **Linked accounts:** `aliases/{email}` = `{uid, at}` lets a second Google account act as someone's main account (Karla: hello@kstarr.com → karlastarr@gmail.com). Linked/unlinked from Check-in → Targets & rules → Linked accounts (main account only). Rules: `me(uid)` also accepts the alias; the email must still be on the member list. Firestore rules are now deployed from `firestore.rules` by the workflow (no more pasting).
