import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWork, todayPicks, blocker, progress, removeTask, countdown } from "../src/work.js";

const T = "2026-10-10";
const w = () => normalizeWork({ perDay: 3, tasks: [
  { id: "a", name: "A", due: "2026-10-05", done: "" },           // overdue
  { id: "b", name: "B", due: "2026-10-20", done: "" },
  { id: "c", name: "C", due: "2026-10-12", done: "", after: "a" }, // blocked by A
  { id: "d", name: "D", due: "", done: "" },
  { id: "e", name: "E", due: "2026-10-11", done: "" },
] });

test("today picks overdue first, skips blocked, fills to perDay", () => {
  assert.deepEqual(todayPicks(w(), T).map((x) => x.id), ["a", "e", "b"]);
});
test("pins come first, swaps drop out, done-today stays", () => {
  const x = w(); x.today = { date: T, pins: ["d"], skips: ["e"] }; x.tasks[1].done = T;
  assert.deepEqual(todayPicks(x, T).map((t) => t.id), ["b", "d", "a"]);
});
test("yesterday's pins don't carry over", () => {
  const x = w(); x.today = { date: "2026-10-09", pins: ["d"], skips: ["a"] };
  assert.deepEqual(todayPicks(x, T).map((t) => t.id), ["a", "e", "b"]);
});
test("blocker clears when prerequisite done; removal frees dependents", () => {
  const x = w();
  assert.equal(blocker(x.tasks[2], x.tasks).id, "a");
  x.tasks[0].done = T; assert.equal(blocker(x.tasks[2], x.tasks), null);
  const y = w(); removeTask(y, "a"); assert.equal(y.tasks.find((t) => t.id === "c").after, undefined);
});
test("progress and countdown", () => {
  const p = progress(w().tasks, T);
  assert.deepEqual([p.total, p.done, p.overdue], [5, 0, 1]);
  assert.equal(countdown("2026-10-11", T), "Due tomorrow");
  assert.equal(countdown("2026-10-08", T), "2 days past due");
});

test("milestone icons: guessed from the name unless picked", async () => {
  const { guessIcon, msIcon } = await import("../src/work.js");
  assert.equal(guessIcon("Packing"), "luggage");
  assert.equal(guessIcon("Docs"), "id-card");
  assert.equal(guessIcon("Meds"), "pill");
  assert.equal(guessIcon("Tech"), "laptop");
  assert.equal(guessIcon("Toiletries"), "bath");
  assert.equal(guessIcon("Pitch podcasts"), "mic");
  assert.equal(guessIcon("Something else"), "flag");
  assert.equal(msIcon({ name: "Meds", icon: "heart" }), "heart");
});
