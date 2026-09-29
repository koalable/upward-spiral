# Upward Spiral of Awesomeness: handoff for a new chat

Last updated Sep 28, 2026 (evening: app moved to app.kstarr.com). Read this first, then `README.md` in the repo.

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
| Check-in | / | Today (just that day: progress rings, to-dos planned or due today + overdue, "N more this week", Work tasks, then the check-in), Meds, Journal, Categories, Targets & rules (incl. Linked accounts), Notifications |
| Habits | /routines | Rituals (run step by step), Set up habits, To-dos (one list grouped Today / This week / Later this month / Later / Someday / Done by date) |
| Work | /work | Today (3–5 picked tasks), Goals (goals → milestones → tasks, dependencies, progress, "Paste a plan from Claude") |
| Progress | /progress | Streaks & badges (check-in streak, 30-day tally, floor day, streak freezes, then per-area calendars), My progress (energy flow), Group |

Old addresses kstarr.com/challenge, /challenge-routines, /challenge-work, /challenge-progress **301-redirect** to the app (set in Webflow Site settings → Publishing). The old Webflow pages were renamed to `challenge-old`, `challenge-routines-old`, `challenge-work-old`, `challenge-progress-old` and kept as backups (still load from jsDelivr; not the main path any more).

Words: **habit** = one recurring action; **ritual** = a saved sequence of habits. Categories = the scored check-in questions.

## Design (approved)
- shadcn-style dark UI plus cream light mode; Inter for text, Instrument Serif for headings and big numbers; Lucide icons. In the installed app the page switcher is a bottom tab bar.
- **Energy flow** groups, used the same way on every page:
  - Fill up / Garden (green): sleep, diet, healthy practices
  - Protect / Tide (blue): substances, screen time
  - Spend well / Ember (orange): writing, reading, movement
  - Show up / Dusk (violet): check-ins, habits, rituals, Work tasks
- Tile **shade = momentum**. This week vs the average of the 3 weeks before, same days so far: >20% up surging, 5–20% up rising, within 5% steady, 5–20% down dipping, >20% down slipping.
- Work goals each get their own colour; their tasks carry a matching stripe.
- Check-in → Today opens with the **day's rings** (`src/rings.js`, `src/views/rings.js`): one ring per group, each a labelled tab (icon, name, points) curling around the centre. Fill up / Protect / Spend well = check-in points in that group. Show up = finishing the check-in + habits due today + today's Work tasks (+ any Show up questions). Centre = average of the rings, day points underneath. Rings sweep in, update live, deepen with a check when full; all full shows a celebration. Tapping a tab jumps to that group.
- Everything streak-related lives on Progress → Streaks & badges. Check-in has no streak info and no banners.
- Accessibility (Sep 28): WCAG AA contrast pass in both themes. Tokens `--control` (borders of inputs/buttons/chips/checkboxes, 3:1+), `--gold` (streak/star colour, dark amber on cream); light `--muted` darkened. Checkboxes are custom: outlined when empty, solid with a check when ticked. Ring tab labels use dark ink; a full ring turns `--s4` with white text. Re-run the audit script idea: measure every text/control against its real background in `dist/preview-*.html`.
- No calendar reminders anywhere any more (Meds, Targets, Habits): phone notifications replace them.
- Substances accept half units: a med can count as 1 or ½ unit per log (Meds → edit item); the stepper moves by ½; up to 1 unit over the limit earns 2.

## Code and deploy
- Source: GitHub **koalable/upward-spiral** (public). `src/` holds the code; `node build.mjs` builds everything; tests: `node --test test/*.test.js`.
- `build.mjs` writes:
  - `app/` → the home-screen app (pages, versioned `js/`, `app.css`, manifest, icons from `app-src/`, service worker from `app-src/sw.js`)
  - `functions/index.js` → the notification server (from `functions/src/index.js`, bundles `src/notify.js`)
  - `dist/cdn/*` → the old Webflow pages' bundles (backup only)
- **Release = build, commit, push to main.** `.github/workflows/deploy-app.yml` publishes Hosting (`app/`), Cloud Functions and Firestore rules automatically using the `FIREBASE_SERVICE_ACCOUNT` secret. Check the run under GitHub → Actions → Deploy app.
- Caching: HTML is served `no-cache` and the service worker revalidates page loads, so a release shows on the next open. (Phones that opened the app before Sep 28 evening may need one close-and-reopen.)
- Firebase project: upward-spiral-of-awesomeness, **Blaze** plan with a $1 budget alert. Google Cloud APIs for Functions, Scheduler, Artifact Registry, Cloud Build, Run, Eventarc, Pub/Sub, Billing etc. are enabled. The service account `firebase-adminsdk-fbsvc@…` has the deploy roles.
- Google sign-in: authDomain is the page's own host; redirect URIs for app.kstarr.com and the web.app domain are on the OAuth web client; app.kstarr.com is an Authorized domain in Firebase Auth. DNS: CNAME `app` → `upward-spiral-of-awesomeness.web.app` at Network Solutions.
- Webflow IDs: site 6933d4ae2e861d77f0889941; old pages checkin 6aadf10cdfca7bb48ab485f5, routines 6ab9cc27b34bf1ccbfbe8156, work 6aba1c3cafaa8c16e9abf6b6, progress 6ab9cc2781d40ecb770f6786.

## Notifications
- Check-in → Notifications. Each person turns them on per device (installed app only) and picks: check-in reminder (time, skipped once finished), ritual start (at ritual times, if not done), meds (at med times, unless that dose is logged), Work morning list (time, off by default), streak saver (time, only if the streak habit is empty), quiet hours. "Send a test" button.
- Meds also get **"next dose OK"** pushes: for meds with hours between doses, once that gap has passed since the last logged dose (today's or yesterday's log).
- Choices + device tokens in `users/{uid}/notify/settings`. Planner is pure `src/notify.js` (tested in `test/notify.test.js`). Server: `notifyTick` runs every 15 minutes in each person's own time zone; `sendTest` is a callable. Web push key (public) is `VAPID_KEY` in build.mjs.

## Linked accounts
- `aliases/{email}` = `{uid, at}` lets a second Google account act as someone's main account (same data, streaks, notifications). Linked/unlinked from Check-in → Targets & rules → Linked accounts, by the main account only. Link first, then sign in with the second address (signing in first starts an empty account).
- Rules: `me(uid)` also accepts an alias; the email must still be on the member list. To add a person or address, edit the list in `firestore.rules` and push.

## Data (Firestore, private per person under users/{uid})
- `days/{date}` check-in answers · `lists/todos` to-dos (items with optional `on` = do-on date and `due` = deadline; `done` = date finished; old `goals/*` day/week/month lists were carried over once and are no longer used) · `lists/routines` habits and rituals · `routinelog/{date}` habits done · `lists/work` goals, milestones, tasks, today's picks · `medlog/{date}` med logs · `notify/settings` notification choices.
- Shared: members, scores, wins, config/season, aliases.

## Status at hand-off
- Done and live: rings, streaks on Progress, half units, the app at app.kstarr.com, notifications server, linked accounts, redirects.
- Waiting on people: Karla installs the app on her iPhone, turns on notifications and sends a test; Karla links hello@kstarr.com; Erik links mxfenrir@gmail.com (both may need to close and reopen the app once).

## Not wanted (for now)
- Sharing "tasks done today" with the group; season week on Group; rituals on the Check-in page.
