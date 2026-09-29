import test from "node:test";
import assert from "node:assert/strict";
import { buckets, dashboard, fromGoals, isOverdue, dayLabel } from "../src/todos.js";

const today = "2026-09-28"; // Monday
const t = (id, extra = {}) => ({ id, t: id, on: "", due: "", done: "", ...extra });

test("items land in the right group by their earliest date", () => {
  const items = [
    t("plan-today", { on: today }), t("due-today", { due: today }), t("late", { due: "2026-09-25" }),
    t("thu", { on: "2026-10-01" }), t("due-fri", { due: "2026-10-02" }), t("sep30", { due: "2026-09-30" }), t("oct", { due: "2026-10-20" }),
    t("nov", { on: "2026-11-02" }), t("someday"), t("done-today", { on: today, done: today }), t("old", { done: "2026-09-20" }),
    t("planned-earlier", { on: "2026-09-26" }), t("do-now-due-later", { on: today, due: "2026-10-09" }),
  ];
  const b = buckets(items, today);
  const ids = (k) => b[k].map((x) => x.id);
  assert.deepEqual(ids("today"), ["late", "due-today", "planned-earlier", "plan-today", "do-now-due-later", "done-today"]);
  assert.deepEqual(ids("week"), ["sep30", "thu", "due-fri"]);
  assert.deepEqual(ids("month"), []);
  assert.deepEqual(ids("later"), ["oct", "nov"]);
  assert.deepEqual(ids("someday"), ["someday"]);
  assert.deepEqual(ids("done"), ["old"]);
  assert.equal(isOverdue(items[2], today), true);
});

test("dashboard shows today plus the rest of this week", () => {
  const d = dashboard([t("a", { on: today }), t("b", { due: "2026-10-04" }), t("c", { due: "2026-10-05" }), t("d")], today);
  assert.deepEqual(d.today.map((x) => x.id), ["a"]);
  assert.deepEqual(d.week.map((x) => x.id), ["b"]); // Sunday is still this week; the next Monday is not
});

test("old day/week/month lists carry over with sensible dates", () => {
  const { items } = fromGoals({
    "d2026-09-28": { items: [{ t: "call mom", done: true }] },
    "w2026-09-28": { items: [{ t: "pitch deck", done: false }] },
    "m2026-09": { items: [{ t: "taxes" }] },
  });
  const by = Object.fromEntries(items.map((x) => [x.t, x]));
  assert.equal(by["call mom"].on, "2026-09-28");
  assert.equal(by["call mom"].done, "2026-09-28");
  assert.equal(by["pitch deck"].due, "2026-10-04");
  assert.equal(by["taxes"].due, "2026-09-30");
});

test("date labels read naturally", () => {
  assert.equal(dayLabel(today, today), "today");
  assert.equal(dayLabel("2026-09-29", today), "tomorrow");
  assert.equal(dayLabel("2026-10-01", today), "Thu");
  assert.equal(dayLabel("2026-10-20", today), "Oct 20");
});
