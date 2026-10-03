import test from "node:test";
import assert from "node:assert/strict";
import { ritualRan, ritualRunsThisWeek } from "../src/routines.js";

const items = [{ id: "a", name: "Draft post", group: "mk", perWeek: 3 }, { id: "b", name: "Publish", group: "mk", perWeek: 3 }];
const log = { "2026-09-28": { done: { a: 1, b: 1 } }, "2026-09-29": { done: { a: 1 } }, "2026-09-30": { done: { a: 1, b: 1 } }, "2026-10-01": {} };
test("a ritual counts as run on days its steps were all done", () => {
  assert.equal(ritualRan(items, "mk", "2026-09-28", log), true);
  assert.equal(ritualRan(items, "mk", "2026-10-01", log), false);
  assert.equal(ritualRunsThisWeek(items, "mk", "2026-10-02", log), 2);
});
