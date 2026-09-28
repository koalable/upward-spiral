import { test } from "node:test";
import assert from "node:assert/strict";
import { isScheduled, dayStatus, scheduleLabel, reminderDays } from "../src/routines.js";
import { runs } from "../src/streaks.js";

// 2026-09-21 is a Monday.
const log = (entries) => Object.fromEntries(Object.entries(entries).map(([d, done]) => [d, { date: d, done }]));

test("fixed-day routines are scheduled only on their days", () => {
  const r = { id: "a", days: [1, 3] };
  assert.equal(isScheduled(r, "2026-09-21", {}), true);
  assert.equal(isScheduled(r, "2026-09-22", {}), false);
  assert.equal(scheduleLabel(r), "Mo We");
  assert.equal(scheduleLabel({ days: [1, 2, 3, 4, 5] }), "Weekdays");
});

test("a 3× a week routine stays open until the quota is met", () => {
  const r = { id: "a", perWeek: 3 };
  const l = log({ "2026-09-21": { a: 1 }, "2026-09-22": { a: 1 }, "2026-09-23": { a: 1 } });
  assert.equal(isScheduled(r, "2026-09-23", l), true); // done that day
  assert.equal(isScheduled(r, "2026-09-24", l), false); // quota met
  assert.equal(isScheduled(r, "2026-09-28", l), true); // new week
});

test("routines added later don't count before they existed", () => {
  assert.equal(isScheduled({ id: "a", since: "2026-09-22" }, "2026-09-21", {}), false);
});

test("day status: flexible routines never spoil a day", () => {
  const rs = [{ id: "a" }, { id: "b", perWeek: 2 }, { id: "c", times: 2 }];
  assert.equal(dayStatus(rs, "2026-09-21", log({ "2026-09-21": { a: 1, c: 2 } })), "all");
  assert.equal(dayStatus(rs, "2026-09-21", log({ "2026-09-21": { a: 1, c: 1 } })), "some");
  assert.equal(dayStatus(rs, "2026-09-21", {}), "none");
  assert.equal(dayStatus([{ id: "a", days: [2] }], "2026-09-21", {}), null);
  assert.deepEqual(reminderDays([{ days: [1] }, { days: [3, 1] }]), [1, 3]);
});

test("runs: rest days don't break a streak; today doesn't until it's over", () => {
  const dates = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"];
  const s = { "2026-09-20": "all", "2026-09-21": null, "2026-09-22": "all", "2026-09-23": "all", "2026-09-24": "none" };
  const r = runs(dates, (d) => s[d]);
  assert.equal(r.current, 3);
  assert.equal(r.best, 3);
  assert.equal(r.byDay["2026-09-23"].star, true); // third day in a row
  s["2026-09-23"] = "some";
  const r2 = runs(dates, (d) => s[d]);
  assert.equal(r2.current, 0);
  assert.equal(r2.best, 2);
});
