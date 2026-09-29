import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLayout, applyPreset, pageLabel, pageHidden, tabHidden, toggleIn } from "../src/layout.js";

test("defaults show everything under the usual names", () => {
  const l = normalizeLayout(undefined);
  assert.equal(l.preset, "full");
  assert.equal(pageLabel(l, "work", "Work"), "Work");
  assert.equal(pageHidden(l, "progress"), false);
});

test("rename a page; blank falls back", () => {
  assert.equal(pageLabel({ names: { work: "House" } }, "work", "Work"), "House");
  assert.equal(pageLabel({ names: { work: "  " } }, "work", "Work"), "Work");
});

test("simple preset hides Habits and Progress but keeps names", () => {
  const l = applyPreset({ names: { work: "House" } }, "simple");
  assert.equal(l.names.work, "House");
  assert.ok(pageHidden(l, "routines") && pageHidden(l, "progress"));
  assert.equal(pageHidden(l, "checkin"), false);
});

test("Check-in and its Today tab can't be hidden", () => {
  const l = { hidePages: ["checkin"], hideTabs: ["today", "meds"] };
  assert.equal(pageHidden(l, "checkin"), false);
  assert.equal(tabHidden(l, "today"), false);
  assert.equal(tabHidden(l, "meds"), true);
});

test("toggling turns a preset into custom, and back when it matches again", () => {
  let l = applyPreset({}, "simple");
  l = toggleIn(l, "hidePages", "progress");
  assert.equal(l.preset, "custom");
  l = toggleIn(l, "hidePages", "progress");
  assert.equal(l.preset, "simple");
});
