# Upward Spiral of Awesomeness

The habit-tracking challenge at **app.kstarr.com** (installable on a phone's home screen). Firebase handles sign-in, data, hosting and push notifications. The old kstarr.com/challenge pages redirect here.

## Layout

```
src/
  constants.js      every tunable number and fixed list
  util.js           dates, numbers, and the html`` template that escapes automatically
  scoring.js        pure scoring (tested) — settings in, points out
  state.js          app state + read-only selectors (streaks, seasons, freezes)
  day.js            editing my day; publishing the numbers the group may see
  meds.js           medication/substance log
  ladder.js         level-up habits: weekly goals, bonuses, levels (tested)
  notifications.js  pop-up alerts (only while the page is open)
  store.js          Firestore/preview storage + debounced saving
  render.js         the one render path: render() redraws, patch() updates live numbers
  actions.js        every button, by name
  events.js         wiring: clicks → actions, typing → state
  main.js           startup, sign-in, subscriptions, midnight rollover
  views/            one file per tab (spiral.js draws the progress spiral)
  app.css
test/               node --test
firestore.rules     database security rules
```

## Everyday commands

```
npm install        once
npm test           run the scoring tests
npm run build      build dist/ and webflow/
```

## Pages

| Page | App URL | Tabs |
|---|---|---|
| Check-in | / | Today, Meds, Journal, Categories, Targets & rules, Notifications |
| Habits | /routines | Rituals, Set up habits, To-dos |
| Work | /work | Today (3–5 picked tasks), Goals (goals → milestones → tasks, dependencies, progress) |
| Progress | /progress | Streaks & badges, My progress, Group |

Each page bundles only its own features (`src/entries/<page>.js`).
A feature (`src/features/*.js`) brings its tabs, button actions, and input handlers; `src/page.js` explains the shape.
Other parts: `src/notify.js` (which reminders are due; tested), `functions/src/index.js` (the notification server), `app-src/` (icons, service worker).

## Deploying

Run `node build.mjs`, then commit and push to main. `.github/workflows/deploy-app.yml` publishes the app
(Firebase Hosting, from `app/`), the notification server (Cloud Functions, from `functions/`) and the
database rules (`firestore.rules`). Nothing to paste anywhere. Watch the run under GitHub → Actions.

One-time setup (already done) is in `docs/APP-SETUP.md`. Try any page offline: open `dist/preview-<page>.html`.

The old Webflow pages (`webflow/`, `dist/cdn/`, served by jsDelivr) are kept only as a backup at
kstarr.com/challenge-old etc.
