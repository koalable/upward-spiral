import test from "node:test";
import assert from "node:assert/strict";
import { suggest, newBreathing, pauseFor, isPaused, isTiny, restartFor, comingBack, moveDueTasks, weekEnds } from "../src/breathing.js";

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

test("the week after is a restart week, then it's over", () => {
  const s = { breathing: [newBreathing({ items: [{ kind: "cat", id: "writing" }] }, "2026-10-01", "b1")] };
  assert.equal(restartFor(s, "2026-10-02"), null);
  assert.equal(restartFor(s, "2026-10-06").id, "b1");
  assert.equal(restartFor(s, "2026-10-13"), null);
});

test("coming back: habits restart; goals are on track or late", () => {
  const tasks = [{ id: "t1", goal: "g1", due: "2026-10-02", done: "" }, { id: "t2", goal: "g2", due: "2026-10-20", done: "" }];
  const goalsById = { g1: { due: "2026-10-15" }, g2: { due: "2026-11-01" } };
  const out = comingBack([{ kind: "habit", id: "h1" }, { kind: "goal", id: "g1" }, { kind: "goal", id: "g2" }], { today: "2026-10-01", goalsById, tasks });
  assert.deepEqual(out.map((x) => x.status), ["restarting", "late", "on track"]);
  const moved = comingBack([{ kind: "goal", id: "g1" }], { today: "2026-10-01", goalsById, tasks, moved: ["g1"] });
  assert.equal(moved[0].status, "on track");
});

test("moving a late goal's tasks to next week", () => {
  const w = { tasks: [{ goal: "g1", due: "2026-10-02", done: "" }, { goal: "g1", due: "2026-09-25", done: "" }, { goal: "g1", due: "2026-10-09", done: "" }] };
  moveDueTasks(w, ["g1"], "2026-10-01");
  assert.deepEqual(w.tasks.map((t) => t.due), ["2026-10-09", "2026-10-08", "2026-10-09"]);
});

test("paused categories sit out of the day's score, streak and floor", async () => {
  const { scoreDay } = await import("../src/scoring.js");
  const cfg = { cats: [{ id: "writing", kind: "builtin", scored: true }, { id: "reading", kind: "builtin", scored: true }], lead: "writing", floor: ["writing", "reading"], targets: { writeMin: 30, readMin: 20 } };
  const day = { date: "2026-10-01", logged: true, a: { reading: 20, sessions: [] } };
  const before = scoreDay(day, cfg);
  assert.equal(before.streakDay, false); // no writing: streak day missed
  const paused = { ...cfg, breathing: [newBreathing({ items: [{ kind: "cat", id: "writing" }] }, "2026-10-01", "b1")] };
  const after = scoreDay(day, paused);
  assert.ok(!("writing" in after.points));
  assert.equal(after.streakDay, true); // the paused streak habit isn't needed
  assert.equal(after.showedUp, true);  // floor = what's left (reading)
  assert.ok(after.total > before.total);
});

test("paused days neither break nor extend a streak run", async () => {
  const { runs } = await import("../src/streaks.js");
  const s = { "d1": "all", "d2": "paused", "d3": "paused", "d4": "all" };
  assert.equal(runs(["d1", "d2", "d3", "d4"], (d) => s[d]).current, 2);
});
