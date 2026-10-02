import test from "node:test";
import assert from "node:assert/strict";
import { hideCat, restoreCat } from "../src/categories.js";

test("hiding keeps the whole category; adding back restores it in place with streak and floor", () => {
  const novel = { id: "q1", kind: "number", name: "Novel", unit: "min", target: 30, dir: "min", scored: true };
  const s = { cats: [{ id: "sleep", kind: "builtin", scored: true }, novel, { id: "diet", kind: "builtin", scored: true }], lead: "q1", floor: ["q1", "sleep"] };
  hideCat(s, "q1");
  assert.deepEqual(s.cats.map((q) => q.id), ["sleep", "diet"]);
  assert.equal(s.hiddenCats[0].name, "Novel");
  s.lead = null; s.floor = ["sleep"]; // what tidying does after a hide
  restoreCat(s, "q1");
  assert.deepEqual(s.cats.map((q) => q.id), ["sleep", "q1", "diet"]);
  assert.deepEqual(s.cats[1], novel);
  assert.equal(s.lead, "q1");
  assert.deepEqual(s.floor, ["sleep", "q1"]);
  assert.equal(s.hiddenCats.length, 0);
});

test("a hidden built-in comes back with its own settings", () => {
  const s = { cats: [{ id: "diet", kind: "number", origin: "builtin", name: "Food", target: 2000, scored: true }], lead: null, floor: [] };
  hideCat(s, "diet");
  assert.equal(s.cats.length, 0);
  restoreCat(s, "diet");
  assert.equal(s.cats[0].name, "Food");
});
