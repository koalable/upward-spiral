import test from "node:test";
import assert from "node:assert/strict";
import { dueNotifications, localNow, inQuiet, markSent } from "../src/notify.js";
import { defaultSettings } from "../src/scoring.js";

const settings = { ...defaultSettings(), meds: [{ id: "m1", name: "Vyvanse", dose: "20", unit: "mg", times: ["08:00", "13:00"] }] };
const date = "2026-09-28"; // a Monday
const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return { date, minutes: h * 60 + m }; };
const ids = (list) => list.map((x) => x.id);

test("check-in fires in its window unless the check-in is finished", () => {
  assert.deepEqual(ids(dueNotifications({}, { settings }, at("21:05"))), ["checkin"]);
  assert.deepEqual(ids(dueNotifications({}, { settings }, at("20:55"))), []);
  assert.deepEqual(ids(dueNotifications({}, { settings }, at("21:50"))), []); // past the catch-up window
  assert.deepEqual(ids(dueNotifications({}, { settings, day: { logged: true, a: { doneAt: 1 } } }, at("21:05"))), []);
});

test("streak saver only when the streak habit is empty", () => {
  assert.deepEqual(ids(dueNotifications({}, { settings }, at("22:10"))), ["streak"]);
  const wrote = { logged: true, a: { sessions: [{ m: 30 }] } };
  assert.deepEqual(ids(dueNotifications({}, { settings, day: wrote }, at("22:10"))), []);
  assert.deepEqual(ids(dueNotifications({}, { settings, day: { logged: true, a: { dayOff: true } } }, at("22:10"))), []);
});

test("meds: the second time fires only if fewer than two doses are logged", () => {
  const one = { items: [{ medId: "m1", at: 1 }] };
  const two = { items: [{ medId: "m1", at: 1 }, { medId: "m1", at: 2 }] };
  assert.deepEqual(ids(dueNotifications({}, { settings, medlog: one }, at("13:00"))), ["med:m1:13:00"]);
  assert.deepEqual(ids(dueNotifications({}, { settings, medlog: two }, at("13:00"))), []);
  assert.deepEqual(ids(dueNotifications({ meds: { on: false } }, { settings }, at("08:10"))), []);
});

test("rituals fire at their time when habits are still open", () => {
  const routines = { items: [{ id: "h1", name: "Stretch", group: "morning" }, { id: "h2", name: "Water", group: "morning" }] };
  assert.deepEqual(ids(dueNotifications({}, { settings, routines }, at("07:05"))), ["ritual:morning"]);
  const done = { done: { h1: 1, h2: 1 } };
  assert.deepEqual(ids(dueNotifications({}, { settings, routines, routinelog: done }, at("07:05"))), []);
});

test("work nudge is off by default and lists open tasks when on", () => {
  const work = { tasks: [{ id: "t1", name: "Draft intro", due: "2026-09-27" }, { id: "t2", name: "Email Chip" }] };
  const noMeds = { meds: { on: false } };
  assert.deepEqual(ids(dueNotifications(noMeds, { settings, work }, at("08:30"))), []);
  const [n] = dueNotifications({ ...noMeds, work: { on: true, time: "08:30" } }, { settings, work }, at("08:31"));
  assert.equal(n.title, "2 tasks today");
  assert.match(n.body, /Draft intro/);
});

test("nothing repeats once sent, and quiet hours hold everything", () => {
  const sent = { sent: markSent({}, date, ["checkin"]) };
  assert.deepEqual(ids(dueNotifications(sent, { settings }, at("21:05"))), []);
  assert.deepEqual(ids(dueNotifications({ quiet: { on: true, from: "20:30", to: "07:00" } }, { settings }, at("21:05"))), []);
  assert.equal(inQuiet({ on: true, from: "22:30", to: "07:00" }, 60), true);
  assert.equal(inQuiet({ on: true, from: "22:30", to: "07:00" }, 12 * 60), false);
});

test("local time follows the person's time zone", () => {
  const ms = Date.UTC(2026, 8, 29, 4, 30); // 04:30 UTC = 21:30 the day before in Los Angeles
  assert.deepEqual(localNow(ms, "America/Los_Angeles"), { date: "2026-09-28", minutes: 21 * 60 + 30, ms });
  assert.deepEqual(localNow(ms, "Asia/Tokyo"), { date: "2026-09-29", minutes: 13 * 60 + 30, ms });
});

test("next dose OK fires once the gap has passed, counting last night's dose", () => {
  const cfg = { ...settings, meds: [{ id: "v", name: "Vyvanse", dose: "20", unit: "mg", every: 4 }] };
  const base = Date.UTC(2026, 8, 28, 15, 0); // any fixed instant
  const now = (minsAfter) => ({ date, minutes: 12 * 60, ms: base + minsAfter * 60_000 });
  const medlog = { items: [{ medId: "v", at: base - 4 * 3_600_000 }] };
  assert.deepEqual(ids(dueNotifications({}, { settings: cfg, medlog }, now(5))), [`doseok:v:${base - 4 * 3_600_000}`]);
  assert.deepEqual(ids(dueNotifications({}, { settings: cfg, medlog }, now(-10))), []); // not yet
  assert.deepEqual(ids(dueNotifications({}, { settings: cfg, medlogPrev: medlog }, now(5))).length, 1);
  const again = { items: [...medlog.items, { medId: "v", at: base }] };
  assert.deepEqual(ids(dueNotifications({}, { settings: cfg, medlog: again }, now(5))), []); // took another since
});

test("few-times-a-week nudge: only when a habit is due, at the pace time", async () => {
  const { dueNotifications } = await import("../src/notify.js");
  const routines = { items: [{ id: "sh", name: "Shower", perWeek: 3, group: "anytime" }] };
  const now = { date: "2026-09-30", minutes: 18 * 60 + 5 };
  const logs = (days) => Object.fromEntries(days.map((d) => [d, { date: d, done: { sh: 1 } }]));
  const prefs = { checkin: { on: false }, rituals: { on: false }, streak: { on: false } };
  const due = dueNotifications(prefs, { settings: {}, routines, routinelogs: logs(["2026-09-28"]) }, now, {});
  assert.equal(due.find((m) => m.id === "pace")?.title, "Time for shower?");
  assert.match(due.find((m) => m.id === "pace").body, /2 days ago · 1 of 3/);
  const notDue = dueNotifications(prefs, { settings: {}, routines, routinelogs: logs(["2026-09-29"]) }, now, {});
  assert.equal(notDue.find((m) => m.id === "pace"), undefined);
});
