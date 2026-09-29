var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target2, all) => {
  for (var name in all)
    __defProp(target2, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/src/index.js
var index_exports = {};
__export(index_exports, {
  notifyTick: () => notifyTick,
  sendTest: () => sendTest
});
module.exports = __toCommonJS(index_exports);
var import_scheduler = require("firebase-functions/v2/scheduler");
var import_https = require("firebase-functions/v2/https");
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_messaging = require("firebase-admin/messaging");

// src/util.js
var toNum = (v) => Number(v) || 0;
var isSet = (v) => v !== void 0 && v !== null && v !== "";
var parseKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
var minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// src/constants.js
var POINTS_PER_CATEGORY = 4;
var SCALED_POINTS = 32;
var CHECK_IN_POINTS = 1;
var MAX_DAILY = SCALED_POINTS + CHECK_IN_POINTS;
var YESTERDAY_CUTOFF_HOUR = 18;
var hour12 = YESTERDAY_CUTOFF_HOUR % 12 || 12;
var EDIT_WINDOW_TEXT = `Log or edit today any time, and yesterday until ${hour12} ${YESTERDAY_CUTOFF_HOUR < 12 ? "am" : "pm"}.`;
var HOUR_MS = 36e5;
var DAY_MS = 24 * HOUR_MS;
var DEFAULT_TARGETS = {
  bedTarget: "23:00",
  wakeTarget: "07:00",
  calTarget: 2200,
  proteinTarget: 120,
  weekPts: 140,
  writeMin: 60,
  readMin: 30,
  customPractice: "",
  substanceLimit: 0,
  substanceRule: "",
  reminder: "21:00"
};
var SCREEN_HABITS = [
  ["noPhoneWake", "Phone stayed out of bed on waking"],
  ["noPhoneSleep", "Phone stayed out of bed before sleep"],
  ["lowScroll", "Under 15 min of mindless scrolling"],
  ["lowEnt", "Under 2 hrs of entertainment"]
];
var WORKOUTS = [["gym", "Gym"], ["stretch", "Stretching"], ["other", "Other workout"]];
var BUILTINS = {
  writing: { name: "Writing", rule: "15 min 1 point, 30 min 2, 60 min 3, 120 min 4." },
  reading: { name: "Reading", rule: "1 point per 15 minutes, up to an hour." },
  sleep: { name: "Sleep", rule: "Bedtime and wake time, 2 points each: within 30 min of target 2, within 60 min 1. Earlier is fine." },
  diet: { name: "Diet", rule: "Within 200 calories of target 2. Fruit and veg or protein goal 2. Processed sugar and food cost 1, or 2 if excess." },
  substances: { name: "Substances", rule: "At or under your daily limit 4, up to one over 2. Half units are fine." },
  movement: { name: "Movement", rule: "Walking: 5k steps or 15 min 1, 8k or 30 min 2. Workout: 15 min 1, over 20 min 2." },
  screen: { name: "Screen time", rule: "1 point for each of four phone and screen habits." },
  practices: { name: "Healthy practices", rule: "Log what you did, then grade your own effort 0 to 4." }
};
var BUILTIN_ORDER = Object.keys(BUILTINS);

// src/scoring.js
var isScored = (q) => q.scored && q.kind !== "text" && q.kind !== "ladder";
var scoredQuestions = (cfg) => (cfg.cats || []).filter(isScored);
function sleepPoints(actual, target2) {
  if (!actual || !target2) return 0;
  let diff = ((minutesOf(actual) - minutesOf(target2)) % 1440 + 1440) % 1440;
  if (diff >= 720) diff -= 1440;
  return diff <= 30 ? 2 : diff <= 60 ? 1 : 0;
}
var writingMinutes = (a) => (a?.sessions || []).reduce((sum, s) => sum + toNum(s.m), 0);
var workoutMinutes = (a) => WORKOUTS.reduce((sum, [id]) => sum + toNum(a?.ex?.[id]), 0);
function builtinPoints(id, a, t, detail) {
  switch (id) {
    case "writing": {
      const m = writingMinutes(a);
      return m >= 120 ? 4 : m >= 60 ? 3 : m >= 30 ? 2 : m >= 15 ? 1 : 0;
    }
    case "reading":
      return Math.min(4, Math.floor(toNum(a.reading) / 15));
    case "sleep":
      detail.bed = sleepPoints(a.bed, t.bedTarget);
      detail.wake = sleepPoints(a.wake, t.wakeTarget);
      return detail.bed + detail.wake;
    case "diet": {
      let pts = 0;
      const cal = toNum(a.calories), protein = toNum(a.protein);
      if (cal > 0 && Math.abs(cal - toNum(t.calTarget)) <= 200) pts += 2;
      if (a.fruitVeg || protein > 0 && protein >= toNum(t.proteinTarget)) pts += 2;
      return Math.max(0, pts - toNum(a.sugar) - toNum(a.processed));
    }
    case "substances": {
      if (!isSet(a.substances)) return 0;
      const over = toNum(a.substances) - toNum(t.substanceLimit);
      return over <= 0 ? 4 : over <= 1 ? 2 : 0;
    }
    case "movement": {
      const steps = toNum(a.steps), walk = toNum(a.walkMin), workout = workoutMinutes(a);
      detail.walk = steps >= 8e3 || walk >= 30 ? 2 : steps >= 5e3 || walk >= 15 ? 1 : 0;
      detail.workout = workout > 20 ? 2 : workout >= 15 ? 1 : 0;
      return detail.walk + detail.workout;
    }
    case "screen":
      return SCREEN_HABITS.filter(([key]) => a[key]).length;
    case "practices":
      return Math.min(4, toNum(a.effort));
    default:
      return 0;
  }
}
function customPoints(q, answers) {
  const v = answers.c?.[q.id];
  switch (q.kind) {
    case "check": {
      const n = (q.items || []).length;
      if (!n || !v) return 0;
      const done = q.items.filter((_, i) => v[i]).length;
      return Math.floor(4 * done / n + 1e-9);
    }
    case "number": {
      if (!isSet(v)) return 0;
      const value = toNum(v), target2 = toNum(q.target);
      if (q.dir === "max") return value <= target2 ? 4 : Math.floor(4 * target2 / value);
      if (target2 <= 0) return value > 0 ? 4 : 0;
      return Math.min(4, Math.floor(4 * value / target2 + 1e-9));
    }
    case "scale":
      return isSet(v) ? Math.max(0, Math.min(4, toNum(v))) : 0;
    default:
      return 0;
  }
}
function scoreDay(day, currentCfg) {
  const result = {
    total: 0,
    points: {},
    detail: { bed: 0, wake: 0, walk: 0, workout: 0 },
    logged: false,
    leadMet: false,
    floorMet: false,
    showedUp: false,
    streakDay: false
  };
  if (!day?.logged) return result;
  const cfg = day.cfg || currentCfg;
  const a = day.a || {};
  const targets = { ...DEFAULT_TARGETS, ...cfg.targets || {} };
  const questions = scoredQuestions(cfg);
  let earned = 0;
  for (const q of questions) {
    const pts = q.kind === "builtin" ? builtinPoints(q.id, a, targets, result.detail) : customPoints(q, a);
    result.points[q.id] = pts;
    earned += pts;
  }
  const possible = questions.length * POINTS_PER_CATEGORY;
  result.logged = true;
  result.total = (possible ? Math.round(earned / possible * SCALED_POINTS) : 0) + CHECK_IN_POINTS;
  const lead = cfg.lead in result.points ? cfg.lead : null;
  result.leadMet = lead ? result.points[lead] >= 1 : true;
  const floor = (cfg.floor || []).filter((id) => id in result.points);
  result.floorMet = floor.length ? floor.every((id) => result.points[id] >= 1) : result.leadMet;
  const excused = Boolean(a.dayOff || a.freeze);
  result.streakDay = result.leadMet || excused;
  result.showedUp = result.floorMet || excused;
  return result;
}

// src/routines.js
var DEFAULT_RITUALS = [
  { id: "morning", name: "Morning", time: "07:00", icon: "wb_sunny" },
  { id: "afternoon", name: "Afternoon", time: "13:00", icon: "light_mode" },
  { id: "evening", name: "Evening", time: "20:00", icon: "bedtime" },
  { id: "anytime", name: "Anytime", time: "", icon: "all_inclusive" }
];
var EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
function normalizeRoutines(doc) {
  const saved = Array.isArray(doc?.rituals) ? doc.rituals : [];
  const oldTimes = doc?.groupTimes || {};
  const rituals = DEFAULT_RITUALS.map((d) => ({ ...d, ...oldTimes[d.id] ? { time: oldTimes[d.id] } : {}, ...saved.find((r) => r.id === d.id) || {} }));
  for (const r of saved) if (!rituals.some((x) => x.id === r.id)) rituals.push(r);
  return { items: Array.isArray(doc?.items) ? doc.items : [], rituals };
}
var inRitual = (items, id) => items.filter((r) => (r.group || "anytime") === id);
var doneCount = (r, key, log) => toNum(log[key]?.done?.[r.id]);
var target = (r) => Math.max(1, toNum(r.times) || 1);
var isDone = (r, key, log) => doneCount(r, key, log) >= target(r);

// src/work.js
function normalizeWork(doc) {
  return {
    goals: Array.isArray(doc?.goals) ? doc.goals : [],
    milestones: Array.isArray(doc?.milestones) ? doc.milestones : [],
    tasks: Array.isArray(doc?.tasks) ? doc.tasks : [],
    today: doc?.today || {},
    perDay: Math.min(5, Math.max(3, Number(doc?.perDay) || 3)),
    archived: Array.isArray(doc?.archived) ? doc.archived : [],
    slips: Array.isArray(doc?.slips) ? doc.slips : [],
    ...doc?.timer ? { timer: doc.timer } : {}
  };
}
var todayState = (w, key) => w.today?.date === key ? w.today : { date: key, pins: [], skips: [], extra: 0 };
function blocker(t, tasks) {
  if (!t.after) return null;
  const b = tasks.find((x) => x.id === t.after);
  return b && !b.done ? b : null;
}
var urgency = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || String(a.created || "").localeCompare(String(b.created || ""));
function todayPicks(w, key) {
  const t = todayState(w, key), size = w.perDay + (t.extra || 0);
  const doneToday = w.tasks.filter((x) => x.done === key);
  const open = w.tasks.filter((x) => !x.done && !blocker(x, w.tasks) && !(w.pausedGoals || []).includes(x.goal));
  const pinned = (t.pins || []).map((id) => open.find((x) => x.id === id)).filter(Boolean);
  const timed = open.filter((x) => x.at && x.due === key && !pinned.includes(x));
  const rest = open.filter((x) => !pinned.includes(x) && !timed.includes(x) && !(t.skips || []).includes(x.id)).sort(urgency);
  const picks = [...doneToday, ...pinned, ...timed];
  for (const x of rest) {
    if (picks.length >= size) break;
    picks.push(x);
  }
  return picks.map((x, i) => [x, i]).sort(([a, i], [b, j]) => (a.at || "99").localeCompare(b.at || "99") || i - j).map(([x]) => x);
}

// src/rings.js
function habitsDue(items, key, log) {
  let due = 0, done = 0;
  for (const r of items) {
    if (r.since && key < r.since) continue;
    const finished = isDone(r, key, log);
    if (r.perWeek ? !finished : !(r.days || EVERY_DAY).includes(parseKey(key).getDay())) continue;
    due++;
    if (finished) done++;
  }
  return { due, done };
}

// src/notify.js
var NOTIFY_DEFAULTS = {
  checkin: { on: true, time: "21:00" },
  rituals: { on: true },
  meds: { on: true },
  work: { on: false, time: "08:30" },
  streak: { on: true, time: "22:00" },
  quiet: { on: false, from: "22:30", to: "07:00" }
};
function normalizeNotify(doc) {
  const out = { ...doc || {} };
  for (const [k, v] of Object.entries(NOTIFY_DEFAULTS)) out[k] = { ...v, ...doc?.[k] || {} };
  out.tokens = Array.isArray(doc?.tokens) ? doc.tokens : [];
  return out;
}
var CATCH_UP_MIN = 40;
function localNow(ms, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), ms };
}
function inQuiet(q, minutes) {
  if (!q?.on || !q.from || !q.to) return false;
  const a = minutesOf(q.from), b = minutesOf(q.to);
  return a <= b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}
var inWindow = (time, minutes) => {
  if (!time) return false;
  const at = minutesOf(time);
  return minutes >= at && minutes - at < CATCH_UP_MIN;
};
var plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
function dueNotifications(prefs, data, now, links = {}) {
  const p = normalizeNotify(prefs);
  const { date, minutes } = now;
  if (inQuiet(p.quiet, minutes)) return [];
  const sent = new Set(p.sent?.date === date ? p.sent.ids || [] : []);
  const out = [];
  const add = (id, title, body, link) => {
    if (!sent.has(id)) out.push({ id, title, body, link });
  };
  const cfg = data.settings || {};
  const day = data.day;
  const home = links.checkin || "/";
  if (p.checkin.on && inWindow(p.checkin.time, minutes) && !day?.a?.doneAt) {
    add("checkin", "Time to check in", "A couple of minutes to fill in today.", home);
  }
  if (p.streak.on && inWindow(p.streak.time, minutes) && cfg.lead) {
    const r = scoreDay(day, cfg);
    const excused = day?.a?.dayOff || day?.a?.freeze;
    if (!r.leadMet && !excused && scoredQuestions(day?.cfg || cfg).some((q) => q.id === cfg.lead)) {
      const q = (cfg.cats || []).find((c) => c.id === cfg.lead);
      const name = q?.kind === "builtin" ? BUILTINS[q.id]?.name : q?.name;
      add("streak", "Save your streak", `Nothing logged for ${(name || "your streak habit").toLowerCase()} yet today.`, home);
    }
  }
  if (p.rituals.on) {
    const { items, rituals } = normalizeRoutines(data.routines);
    const log = data.routinelog ? { [date]: data.routinelog } : {};
    for (const r of rituals) {
      if (!r.time || !inWindow(r.time, minutes)) continue;
      const { due, done } = habitsDue(inRitual(items, r.id), date, log);
      if (due > done) add(`ritual:${r.id}`, `${r.name} ritual`, `${plural(due - done, "habit")} to go.`, links.routines || home);
    }
  }
  if (p.meds.on) {
    const taken = (id) => (data.medlog?.items || []).filter((x) => x.medId === id).length;
    for (const m of (cfg.meds || []).filter((x) => x.active !== false)) {
      (m.times || []).filter(Boolean).sort().forEach((t, i) => {
        if (inWindow(t, minutes) && taken(m.id) <= i) {
          add(`med:${m.id}:${t}`, `Time for ${m.name}`, [m.dose, m.unit].filter(Boolean).join(" ") || "Tap to log it.", home);
        }
      });
    }
  }
  if (p.meds.on && now.ms) {
    const logs = [...data.medlogPrev?.items || [], ...data.medlog?.items || []];
    for (const m of (cfg.meds || []).filter((x) => x.active !== false && Number(x.every) > 0)) {
      const last = logs.filter((x) => x.medId === m.id).sort((a, b) => b.at - a.at)[0];
      if (!last) continue;
      const okAt = last.at + Number(m.every) * 36e5;
      if (now.ms >= okAt && now.ms - okAt < CATCH_UP_MIN * 6e4) {
        add(`doseok:${m.id}:${last.at}`, `${m.name}${m.dose ? ` ${m.dose}${m.unit ? " " + m.unit : ""}` : ""} OK now`, "Next dose is OK if you need it.", home);
      }
    }
  }
  if (p.work.on && inWindow(p.work.time, minutes)) {
    const picks = todayPicks(normalizeWork(data.work), date).filter((t) => !t.done);
    if (picks.length) add("work", `${plural(picks.length, "task")} today`, picks.slice(0, 3).map((t) => t.name).join(" \xB7 "), links.work || home);
  }
  return out;
}
var markSent = (prefs, date, ids) => ({
  date,
  ids: [.../* @__PURE__ */ new Set([...prefs?.sent?.date === date ? prefs.sent.ids || [] : [], ...ids])]
});
function timerMessage(tm, nowMs, links = {}) {
  if (!tm?.end || tm.sent === tm.end || nowMs < tm.end || nowMs - tm.end > CATCH_UP_MIN * 6e4) return null;
  return { id: `timer:${tm.id}`, title: "Time's up", body: tm.name ? `${tm.name}: done, or a bit longer?` : "Done, or a bit longer?", link: links.work || "/" };
}

// functions/src/index.js
(0, import_app.initializeApp)();
var db = (0, import_firestore.getFirestore)();
var BASE = "https://app.kstarr.com";
var LINKS = { checkin: `${BASE}/`, routines: `${BASE}/routines`, work: `${BASE}/work`, progress: `${BASE}/progress` };
var GONE = /* @__PURE__ */ new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);
async function push(tokens, messages) {
  const dead = /* @__PURE__ */ new Set();
  for (const m of messages) {
    const live = tokens.filter((t) => !dead.has(t));
    if (!live.length) break;
    const res = await (0, import_messaging.getMessaging)().sendEachForMulticast({
      tokens: live,
      webpush: {
        notification: { title: m.title, body: m.body, icon: `${BASE}/icon-192.png`, badge: `${BASE}/icon-192.png`, tag: m.id },
        fcmOptions: { link: m.link || LINKS.checkin }
      },
      data: { link: m.link || LINKS.checkin }
    });
    res.responses.forEach((r, i) => {
      if (!r.success && GONE.has(r.error?.code)) dead.add(live[i]);
    });
  }
  return tokens.filter((t) => !dead.has(t));
}
var prevDate = (date) => {
  const d = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
async function userData(uid, date) {
  const u = db.collection("users").doc(uid);
  const refs = [
    u,
    u.collection("days").doc(date),
    u.collection("lists").doc("routines"),
    u.collection("routinelog").doc(date),
    u.collection("lists").doc("work"),
    u.collection("medlog").doc(date),
    u.collection("medlog").doc(prevDate(date))
  ];
  const [settings, day, routines, routinelog, work, medlog, medlogPrev] = (await db.getAll(...refs)).map((s) => s.exists ? s.data() : null);
  return { settings, day, routines, routinelog, work, medlog, medlogPrev };
}
var notifyTick = (0, import_scheduler.onSchedule)({ schedule: "every 1 minutes", timeZone: "UTC", region: "us-central1", memory: "256MiB" }, async () => {
  const snap = await db.collectionGroup("notify").get();
  const settingsOf = new Map(snap.docs.filter((d) => d.id === "settings").map((d) => [d.ref.parent.parent.id, d.data()]));
  for (const doc of snap.docs) {
    if (doc.id !== "timer") continue;
    const tm = doc.data(), msg = timerMessage(tm, Date.now(), LINKS);
    if (!msg) continue;
    const tokens = (settingsOf.get(doc.ref.parent.parent.id)?.tokens || []).map((x) => x.t).filter(Boolean);
    try {
      if (tokens.length) await push(tokens, [msg]);
      await doc.ref.update({ sent: tm.end });
    } catch (err) {
      console.error(`timer ${doc.ref.path}`, err);
    }
  }
  if ((/* @__PURE__ */ new Date()).getUTCMinutes() % 15) return;
  for (const doc of snap.docs) {
    if (doc.id !== "settings") continue;
    const uid = doc.ref.parent.parent.id;
    const prefs = doc.data();
    const tokens = (prefs.tokens || []).map((x) => x.t).filter(Boolean);
    if (!tokens.length) continue;
    try {
      const now = localNow(Date.now(), prefs.tz);
      const messages = dueNotifications(prefs, await userData(uid, now.date), now, LINKS);
      if (!messages.length) continue;
      const keep = await push(tokens, messages);
      await doc.ref.update({
        sent: markSent(prefs, now.date, messages.map((m) => m.id)),
        tokens: (prefs.tokens || []).filter((x) => keep.includes(x.t))
      });
    } catch (err) {
      console.error(`notify ${uid}`, err);
    }
  }
});
var sendTest = (0, import_https.onCall)({ region: "us-central1" }, async (req) => {
  if (!req.auth?.uid) throw new import_https.HttpsError("unauthenticated", "Sign in first.");
  const email = String(req.auth.token.email || "").toLowerCase();
  const alias = email ? await db.doc(`aliases/${email}`).get() : null;
  const uid = alias?.exists ? alias.data().uid : req.auth.uid;
  const ref = db.doc(`users/${uid}/notify/settings`);
  const prefs = normalizeNotify((await ref.get()).data());
  const tokens = prefs.tokens.map((x) => x.t).filter(Boolean);
  if (!tokens.length) throw new import_https.HttpsError("failed-precondition", "Turn on notifications on this device first.");
  const keep = await push(tokens, [{ id: "test", title: "Notifications are on", body: "This is what a reminder looks like.", link: LINKS.checkin }]);
  if (keep.length !== tokens.length) await ref.update({ tokens: prefs.tokens.filter((x) => keep.includes(x.t)) });
  return { devices: keep.length };
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  notifyTick,
  sendTest
});
