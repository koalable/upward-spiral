import test from "node:test";
import assert from "node:assert/strict";
import { parseRoute, formatRoute } from "../src/route.js";

test("routes round-trip", () => {
  for (const r of [{ tab: "today" }, { tab: "wgoals", goal: "g1" }, { tab: "wtoday", goal: "g 2", ms: "m/1" }]) {
    assert.deepEqual(parseRoute(formatRoute(r)), r);
  }
});
test("empty, odd and old addresses", () => {
  assert.deepEqual(parseRoute(""), { tab: "" });
  assert.deepEqual(parseRoute("#settings"), { tab: "customize" });
  assert.deepEqual(parseRoute("#wgoals/goal"), { tab: "wgoals" });
});
