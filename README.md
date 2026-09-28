# Upward Spiral of Awesomeness

The habit-tracking challenge at kstarr.com/challenge. Firebase handles sign-in and data; Webflow hosts the page.

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

The app is three Webflow pages that share the same sign-in and data:

| Page | URL | Tabs |
|---|---|---|
| Check-in | /challenge | Today, Meds, Journal, My questions, Targets & rules |
| Routines | /challenge-routines | Routines, Set up routines, To-dos |
| Work | /challenge-work | Today (3–5 picked tasks), Goals (goals → milestones → tasks, dependencies, progress) |
| Progress | /challenge-progress | Streaks & badges, My progress, Group |

Each page bundles only its own features (`src/entries/<page>.js`), so each stays well under Webflow's limits.
A feature (`src/features/*.js`) brings its tabs, button actions, and input handlers; `src/page.js` explains the shape.

## Deploying

The app code lives in this GitHub repo and is served free by jsDelivr. Webflow pages only hold a few lines that point at it.

1. Commit your changes and push.
2. Run `RELEASE=<commit id> node build.mjs` with the id of the pushed commit that contains the new `dist/`.
3. Paste `webflow/<page>/PAGE-HEAD.txt` and `PAGE-FOOTER.txt` into each page's custom code (or set them through Webflow's API), then publish.

jsDelivr caches a pinned commit forever, so every release points at a new commit id. The Code Embed (`<div id="wlc"></div>`) is optional; the footer adds it if missing.
Try any page offline: open `dist/preview-<page>.html`.

Design: `src/ui.css` is a shadcn/ui-style look in plain CSS (zinc palette, Inter, Lucide icons). No framework.

**Rules.** Paste `firestore.rules` into Firebase → Firestore → Rules and publish.


## Principles

- Private data lives under `users/{uid}/…` (including routines and the routine log); only the owner can read it.
- Shared data (`members`, `scores`, `wins`, `config/season`) is limited by the rules to specific fields.
- A day stores the questions it was scored with, so editing questions never rewrites history.
- Scores are computed on each player's device (trust-based among friends).
