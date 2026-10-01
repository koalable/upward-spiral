import { test } from "node:test";
import assert from "node:assert/strict";
import { isScheduled, dayStatus, scheduleLabel } from "../src/routines.js";
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

test("pace: a 3× a week habit is due after two days, or when the week is running out", async () => {
  const { pace } = await import("../src/routines.js");
  const r = { id: "sh", perWeek: 3 };
  const log = (days) => Object.fromEntries(days.map((d) => [d, { done: { sh: 1 } }]));
  // Week of Mon 2026-09-28. Done Mon; Tue: 1 day since → not due; Wed: 2 days → due.
  assert.equal(pace(r, "2026-09-29", log(["2026-09-28"])).due, false);
  assert.equal(pace(r, "2026-09-30", log(["2026-09-28"])).due, true);
  assert.equal(pace(r, "2026-09-30", log(["2026-09-28"])).last, 2);
  // Done today → not due
  assert.equal(pace(r, "2026-09-30", log(["2026-09-28", "2026-09-30"])).due, false);
  // Saturday with 1 of 3 and done yesterday: behind (2 needed, 2 days left) → due anyway
  const p = pace(r, "2026-10-03", log(["2026-10-02"]));
  assert.ok(p.due && p.behind);
  // Week's number met → never due
  assert.equal(pace(r, "2026-10-03", log(["2026-09-28", "2026-09-30", "2026-10-01"])).due, false);
});
