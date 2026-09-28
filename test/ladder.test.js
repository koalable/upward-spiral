import { test } from "node:test";
import assert from "node:assert/strict";
import { ladderStatus, bonusOn, weekSummary, levelOf } from "../src/ladder.js";

// Monday 2026-09-21 … Sunday 2026-09-27; Monday 2026-09-28 …
const q = { id: "ex", kind: "ladder", mode: "days", levels: [{ days: 2 }, { days: 3 }], level: 0, levelSince: "2026-09-21", weeksToLevel: 2 };
const did = (...dates) => Object.fromEntries(dates.map((d) => [d, { logged: true, a: { c: { ex: true } } }]));

test("the weekly goal is hit on the day the count reaches the quota", () => {
  const days = did("2026-09-22", "2026-09-24", "2026-09-26");
  assert.equal(weekSummary(q, "2026-09-23", days).hitOn, "2026-09-24");
  assert.deepEqual(bonusOn("2026-09-24", [q], days), { bonus: 5, levelUp: false });
  assert.equal(bonusOn("2026-09-26", [q], days).bonus, 0);
});

test("two weeks in a row completes the level", () => {
  const days = did("2026-09-22", "2026-09-24", "2026-09-29", "2026-09-30");
  const s = ladderStatus(q, days, "2026-09-30");
  assert.equal(s.completedOn, "2026-09-30");
  assert.deepEqual(bonusOn("2026-09-30", [q], days), { bonus: 20, levelUp: true });
});

test("a missed finished week resets the run", () => {
  const days = did("2026-09-22", "2026-09-24", "2026-10-06", "2026-10-07");
  const s = ladderStatus(q, days, "2026-10-07");
  assert.equal(s.run, 1);
  assert.equal(s.completedOn, null);
});

test("minutes mode needs the level's minimum", () => {
  const m = { id: "ex", kind: "ladder", mode: "minutes", levels: [{ days: 2, minutes: 10 }], levelSince: "2026-09-21" };
  const days = { "2026-09-22": { logged: true, a: { c: { ex: 5 } } }, "2026-09-23": { logged: true, a: { c: { ex: 10 } } }, "2026-09-24": { logged: true, a: { c: { ex: 12 } } } };
  assert.equal(weekSummary(m, "2026-09-22", days).hitOn, "2026-09-24");
});

test("levels clamp to the list", () => {
  assert.equal(levelOf(q, 9).number, 2);
  assert.equal(levelOf(q, 9).isTop, true);
});

test("a remembered level-up keeps its bonus after moving up", () => {
  const up = { ...q, level: 1, levelSince: "2026-09-28", history: [{ level: 0, on: "2026-09-30" }] };
  const days = did("2026-09-22", "2026-09-24", "2026-09-29", "2026-09-30");
  assert.equal(bonusOn("2026-09-30", [up], days).levelUp, true);
});
