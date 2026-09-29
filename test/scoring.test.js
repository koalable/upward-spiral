import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreDay, defaultSettings, customPoints, sleepPoints, builtinAsCustom } from "../src/scoring.js";

const cfg = defaultSettings();
const day = (a, extra = {}) => ({ logged: true, a: { sessions: [], ex: {}, c: {}, ...a }, ...extra });

test("an unlogged day scores nothing", () => {
  assert.equal(scoreDay({ a: {} }, cfg).total, 0);
  assert.equal(scoreDay(null, cfg).total, 0);
});

test("logging anything earns the check-in point", () => {
  assert.equal(scoreDay(day({}), cfg).total, 1);
});

test("a perfect default day is 33", () => {
  const a = {
    sessions: [{ m: 120 }], reading: 60, bed: "23:00", wake: "07:00",
    calories: 2200, fruitVeg: true, substances: 0, steps: 9000, ex: { gym: 30 },
    noPhoneWake: true, noPhoneSleep: true, lowScroll: true, lowEnt: true, effort: 4,
  };
  assert.equal(scoreDay(day(a), cfg).total, 33);
});

test("an unanswered substances question earns nothing", () => {
  assert.equal(scoreDay(day({}), cfg).points.substances, 0);
  assert.equal(scoreDay(day({ substances: 0 }), cfg).points.substances, 4);
  assert.equal(scoreDay(day({ substances: 1 }), cfg).points.substances, 2);
  assert.equal(scoreDay(day({ substances: 2 }), cfg).points.substances, 0);
});

test("writing tiers", () => {
  const pts = (m) => scoreDay(day({ sessions: [{ m }] }), cfg).points.writing;
  assert.deepEqual([14, 15, 30, 59, 60, 120].map(pts), [0, 1, 2, 2, 3, 4]);
});

test("sleep: earlier is fine, wraps midnight", () => {
  assert.equal(sleepPoints("22:00", "23:00"), 2);
  assert.equal(sleepPoints("23:45", "23:00"), 1);
  assert.equal(sleepPoints("00:30", "23:00"), 0);
  assert.equal(sleepPoints("23:20", "23:00"), 2);
});

test("diet never goes below zero", () => {
  assert.equal(scoreDay(day({ sugar: 2, processed: 2 }), cfg).points.diet, 0);
});

test("totals are scaled so fewer categories still max at 33", () => {
  const small = { ...cfg, cats: [{ id: "w", kind: "check", scored: true, items: ["x"] }], lead: "w", floor: [] };
  assert.equal(scoreDay(day({ c: { w: { 0: true } } }), small).total, 33);
  assert.equal(scoreDay(day({}), small).total, 1);
});

test("custom question types", () => {
  const check = { id: "q", kind: "check", items: ["a", "b", "c"] };
  assert.equal(customPoints(check, { c: { q: { 0: true } } }), 1);
  assert.equal(customPoints(check, { c: { q: { 0: true, 1: true } } }), 2);
  const atLeast = { id: "q", kind: "number", dir: "min", target: 8 };
  assert.equal(customPoints(atLeast, { c: { q: 6 } }), 3);
  assert.equal(customPoints(atLeast, { c: {} }), 0);
  const atMost = { id: "q", kind: "number", dir: "max", target: 2 };
  assert.equal(customPoints(atMost, { c: { q: 2 } }), 4);
  assert.equal(customPoints(atMost, { c: { q: 4 } }), 2);
  assert.equal(customPoints({ id: "q", kind: "scale" }, { c: { q: 3 } }), 3);
});

test("day off and freeze keep the streak and count as showing up", () => {
  const r = scoreDay(day({ dayOff: true }), cfg);
  assert.equal(r.streakDay, true);
  assert.equal(r.showedUp, true);
  assert.equal(r.floorMet, false);
});

test("a day keeps the questions it was scored with", () => {
  const old = day({ sessions: [{ m: 60 }] }, { cfg: defaultSettings() });
  const changed = { ...defaultSettings(), cats: [] };
  assert.equal(scoreDay(old, changed).points.writing, 3);
});

test("converted built-ins keep their id so streak settings survive", () => {
  const q = builtinAsCustom("screen", defaultSettings().targets);
  assert.equal(q.id, "screen");
  assert.equal(q.items.length, 4);
});

test("substances: half units count, and up to one unit over still earns 2", () => {
  const c = { ...cfg, targets: { ...cfg.targets, substanceLimit: 2 } };
  const pts = (n) => scoreDay(day({ substances: n }), c).points.substances;
  assert.equal(pts(1.5), 4);
  assert.equal(pts(2), 4);
  assert.equal(pts(2.5), 2);
  assert.equal(pts(3), 2);
  assert.equal(pts(3.5), 0);
});
