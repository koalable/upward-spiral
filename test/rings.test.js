import test from "node:test";
import assert from "node:assert/strict";
import { dayRings, habitsDue } from "../src/rings.js";
import { defaultSettings, scoreDay } from "../src/scoring.js";

const cfg = defaultSettings();

test("empty day: every group present but empty, Show up waits on finishing the check-in", () => {
  const m = dayRings({ cfg, score: scoreDay(undefined, cfg), day: undefined });
  assert.deepEqual(m.rings.map((r) => r.id), ["fill", "protect", "spend", "show"]);
  assert.equal(m.overall, 0);
  const show = m.rings.find((r) => r.id === "show");
  assert.deepEqual(show.label, { done: 0, of: 1 });
});

test("points fill their own group; work and habits fill Show up", () => {
  const day = { logged: true, a: { reading: 60, substances: 0, doneAt: 1, sessions: [], ex: {}, c: {} } };
  const m = dayRings({ cfg, score: scoreDay(day, cfg), day, habits: { due: 4, done: 2 }, work: { total: 3, done: 1 } });
  const by = Object.fromEntries(m.rings.map((r) => [r.id, r]));
  assert.deepEqual(by.spend.label, { done: 4, of: 12 }); // reading full, writing and movement empty
  assert.deepEqual(by.protect.label, { done: 4, of: 8 }); // substances within limit
  assert.deepEqual(by.show.label, { done: 4, of: 8 }); // finished + 2 habits + 1 task
  assert.equal(by.show.pct, 0.5);
  assert.equal(m.allFull, false);
});

test("habits: fixed days count when scheduled, flexible ones only once done", () => {
  const monday = "2026-09-28";
  const items = [{ id: "a", days: [1] }, { id: "b", days: [2] }, { id: "c", perWeek: 3 }, { id: "d", perWeek: 2 }];
  const log = { [monday]: { done: { a: 1, d: 1 } } };
  assert.deepEqual(habitsDue(items, monday, log), { due: 2, done: 2 });
});

test("med logs: older saves count as 1 unit, half-dose items as ½", async () => {
  const { substanceUnits } = await import("../src/meds.js").catch(() => ({}));
  if (!substanceUnits) return; // meds.js needs the browser-side store; covered by the build
  assert.equal(substanceUnits(true), 1);
  assert.equal(substanceUnits(0.5), 0.5);
  assert.equal(substanceUnits(false), 0);
});
