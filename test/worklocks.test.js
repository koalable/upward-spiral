import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWork, msBlocker, todayPicks, staleTasks, activeGoals } from "../src/work.js";

const w = () => normalizeWork({ perDay: 5, goals: [{ id: "g", name: "Book" }, { id: "h", name: "Old", archived: "2026-10-01" }],
  milestones: [{ id: "m1", goal: "g", name: "Draft", due: "2026-10-10" }, { id: "m2", goal: "g", name: "Feedback", due: "2026-11-01" }, { id: "m0", goal: "g", name: "Empty", due: "2026-10-01" }],
  tasks: [
    { id: "a", goal: "g", ms: "m1", name: "Write", due: "2026-09-01", done: "" },
    { id: "b", goal: "g", ms: "m2", name: "Send", due: "2026-09-01", done: "" },
    { id: "c", goal: "g", ms: "", name: "Loose", done: "" },
    { id: "d", goal: "h", ms: "", name: "Archived task", due: "2026-09-01", done: "" },
  ] });

test("a milestone locks until the one before is done; empty milestones don't block", () => {
  const x = w();
  assert.equal(msBlocker(x, "m1"), null);
  assert.equal(msBlocker(x, "m2").id, "m1");
  x.tasks[0].done = "2026-10-02";
  assert.equal(msBlocker(x, "m2"), null);
});
test("locked and archived tasks stay off Today and Tidy up", () => {
  const x = w();
  assert.deepEqual(todayPicks(x, "2026-10-02").map((t) => t.id).sort(), ["a", "c"]);
  assert.deepEqual(staleTasks(x, "2026-10-02").map((t) => t.id), ["a"]);
  assert.deepEqual(activeGoals(x).map((g) => g.id), ["g"]);
});

test("a project can let its milestones run in any order", () => {
  const x = w(); x.goals[0].anyOrder = true;
  assert.equal(msBlocker(x, "m2"), null);
});
