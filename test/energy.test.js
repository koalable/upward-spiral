import test from "node:test";
import assert from "node:assert/strict";
import { momentum, windows, trend, groupOf } from "../src/energy.js";

test("momentum thresholds", () => {
  assert.equal(momentum(13, 10), 4); assert.equal(momentum(11, 10), 3); assert.equal(momentum(10.3, 10), 2);
  assert.equal(momentum(9, 10), 1); assert.equal(momentum(7, 10), 0); assert.equal(momentum(0, 0), 2); assert.equal(momentum(3, 0), 4);
});
test("windows use the same weekdays; empty week falls back to last week", () => {
  const w = windows("2026-10-01", true); // Thursday
  assert.equal(w.days, 4); assert.equal(w.windows.length, 6);
  assert.deepEqual(w.windows[5], ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.equal(w.windows[4][0], "2026-09-21");
  const m = windows("2026-09-28", false); // Monday, nothing logged
  assert.equal(m.days, 7); assert.equal(m.lastWeek, true); assert.equal(m.windows[5][0], "2026-09-21");
});
test("trend averages the three weeks before", () => {
  assert.deepEqual(trend([1, 2, 6, 6, 6, 9]), { now: 9, before: 6, avg: 6, level: 4 });
  assert.equal(groupOf({ id: "sleep" }).id, "fill"); assert.equal(groupOf({ id: "x", group: "protect" }).id, "protect");
});
