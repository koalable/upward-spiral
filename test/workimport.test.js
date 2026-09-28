import test from "node:test";
import assert from "node:assert/strict";
import { parsePlan } from "../src/workimport.js";
let n = 0; const id = (p) => p + ++n;
test("parses goals, milestones, tasks, hours and dependencies", () => {
  const p = parsePlan(`GOAL: Launch | due 2027-09-30
## Email list | due 2026-10-31
- Welcome email | due 2026-10-05 | 2h
- Lead magnet | due 2026-10-12 | 90 min | after: Welcome email
* Loose task
Random chatter
- Bad dep | after: Nope`, id);
  assert.equal(p.goals.length, 1); assert.equal(p.goals[0].due, "2027-09-30");
  assert.equal(p.milestones.length, 1); assert.equal(p.tasks.length, 4);
  const [a, b, c] = p.tasks;
  assert.equal(a.hours, 2); assert.equal(b.hours, 1.5); assert.equal(b.after, a.id);
  assert.equal(c.due, "2026-10-31"); // falls back to milestone date
  assert.equal(p.skipped.length, 2);
});
