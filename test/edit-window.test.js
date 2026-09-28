import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { isEditable } from "../src/state.js";

const at = (iso) => mock.timers.enable({ apis: ["Date"], now: new Date(iso) });

test("yesterday stays editable until 6 pm, then closes", () => {
  at("2026-09-28T17:59:00");
  assert.equal(isEditable("2026-09-27"), true);
  assert.equal(isEditable("2026-09-28"), true);
  mock.timers.reset();
  at("2026-09-28T18:00:00");
  assert.equal(isEditable("2026-09-27"), false);
  assert.equal(isEditable("2026-09-28"), true);
  mock.timers.reset();
});

test("two days ago is never editable", () => {
  at("2026-09-28T08:00:00");
  assert.equal(isEditable("2026-09-26"), false);
  mock.timers.reset();
});
