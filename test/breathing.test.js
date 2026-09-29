import test from "node:test";
import assert from "node:assert/strict";
import { suggest, newBreathing, pauseFor, isPaused, isTiny, makeUpFor, makeUpLines, weekEnds } from "../src/breathing.js";

const cats = [{ id: "sleep" }, { id: "diet" }, { id: "writing" }, { id: "reading" }, { id: "screen" }];
const habits = [{ id: "h1", name: "Gym", minutes: 45, days: [1, 3, 5] }, { id: "h2", name: "Vitamins", minutes: 0, days: [0, 1, 2, 3, 4, 5, 6] }];
const goals = [{ id: "g1", name: "Book proposal" }];

test("levels suggest more as you need more room; basics stay", () => {
  assert.deepEqual(suggest("little", { cats, habits, goals }), []);
  const some = suggest("some", { cats, habits, goals }).map((x) => x.id);
  assert.deepEqual(some, ["writing", "reading", "h1"]);
  const lot = suggest("lot", { cats, habits, goals }).map((x) => x.id);
  assert.ok(!lot.includes("sleep") && !lot.includes("diet"));
  assert.ok(lot.includes("screen") && lot.includes("h2") && lot.includes("g1"));
});

test("a breathing room covers its own week; tiny items aren't paused", () => {
  const b = newBreathing({ items: [{ kind: "cat", id: "writing" }, { kind: "habit", id: "h1" }], tiny: [{ kind: "habit", id: "h1" }], why: "travel", makeUp: 3 }, "2026-10-01", "b1");
  assert.equal(b.week, "2026-09-28");
  const s = { breathing: [b] };
  assert.ok(isPaused(s, "cat", "writing", "2026-10-04"));
  assert.ok(!isPaused(s, "habit", "h1", "2026-10-02"));
  assert.ok(isTiny(s, "habit", "h1", "2026-10-02"));
  assert.equal(pauseFor(s, "2026-10-05"), null); // next week it's over
  assert.equal(weekEnds("2026-10-01"), "2026-10-04");
});

test("make-up weeks follow, then end", () => {
  const s = { breathing: [newBreathing({ items: [{ kind: "cat", id: "writing" }], makeUp: 2 }, "2026-10-01", "b1")] };
  assert.equal(makeUpFor(s, "2026-10-02"), null);
  assert.equal(makeUpFor(s, "2026-10-06").week, 1);
  assert.equal(makeUpFor(s, "2026-10-13").week, 2);
  assert.equal(makeUpFor(s, "2026-10-20"), null);
});

test("make-up plan spreads the time", () => {
  const lines = makeUpLines([{ kind: "cat", id: "writing" }, { kind: "habit", id: "h1" }, { kind: "goal", id: "g1" }], 3, {
    targets: { writeMin: 30 }, habitsById: { h1: habits[0] }, goalsById: { g1: goals[0] }, catName: () => "Writing",
  });
  assert.deepEqual(lines, ["Writing: +10 min a day for 3 weeks.", "Gym: +1 a week for 3 weeks.", "Book proposal: deadlines stay; this week's tasks come back next week."]);
});
