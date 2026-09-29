import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWork, todayPicks, progress } from "../src/work.js";
import { minutesLeft, startTimer, pauseTimer, stopTimer, addTime, msLeft, isUp, countdownText, durationText } from "../src/timer.js";
import { timerMessage } from "../src/notify.js";

const MIN = 60_000, T0 = 1_000_000_000_000;
const w = () => normalizeWork({ tasks: [
  { id: "a", name: "Draft", hours: 1, spent: 20 },
  { id: "b", name: "Email", hours: "" },
  { id: "c", name: "Edit", hours: 0.5, spent: 45 },
] });

test("counts down from what's left of the estimate", () => {
  const x = w();
  assert.equal(minutesLeft(x.tasks[0]), 40);
  assert.equal(minutesLeft(x.tasks[1]), 25); // no estimate
  assert.equal(minutesLeft(x.tasks[2]), 15); // estimate used up
  startTimer(x, "a", T0);
  assert.equal(msLeft(x.timer, T0), 40 * MIN);
});

test("pause and resume keep the time left and add up time spent", () => {
  const x = w();
  startTimer(x, "a", T0);
  pauseTimer(x, T0 + 10 * MIN);
  assert.equal(x.tasks[0].spent, 30);
  assert.equal(msLeft(x.timer, T0 + 99 * MIN), 30 * MIN); // paused: doesn't move
  startTimer(x, "a", T0 + 60 * MIN);
  assert.equal(x.timer.end, T0 + 90 * MIN);
  stopTimer(x, T0 + 65 * MIN);
  assert.equal(x.tasks[0].spent, 35);
  assert.equal(x.timer, undefined);
});

test("time spent stops counting when the timer runs out; +10 min carries on", () => {
  const x = w();
  startTimer(x, "b", T0);
  assert.ok(isUp(x.timer, T0 + 30 * MIN));
  addTime(x, T0 + 30 * MIN);
  assert.equal(x.tasks[1].spent, 25);
  assert.equal(msLeft(x.timer, T0 + 30 * MIN), 10 * MIN);
});

test("starting another task's timer stops the first", () => {
  const x = w();
  startTimer(x, "a", T0);
  startTimer(x, "b", T0 + 5 * MIN);
  assert.equal(x.timer.id, "b");
  assert.equal(x.tasks[0].spent, 25);
});

test("tasks with a start time go to the top; timed tasks due today always make the list", () => {
  const K = "2026-10-10";
  const x = normalizeWork({ perDay: 3, tasks: [
    { id: "a", name: "A", due: "2026-10-05" },
    { id: "b", name: "B", due: "2026-10-06" },
    { id: "c", name: "C", due: "2026-10-07" },
    { id: "d", name: "D", due: K, at: "14:00" },
    { id: "e", name: "E", due: "2026-10-04", at: "09:30" },
    { id: "f", name: "F", due: "2026-10-09", at: "08:00" }, // timed, but not due today and not urgent enough
  ] });
  assert.deepEqual(todayPicks(x, K).map((t) => t.id), ["e", "d", "a"]);
});

test("projects add up time spent", () => {
  assert.equal(progress(w().tasks, "2026-10-10").spent, 65);
});

test("time's up notification fires once, soon after the end", () => {
  const tm = { id: "a", name: "Draft", end: T0 };
  assert.equal(timerMessage(tm, T0 - 1), null);
  assert.equal(timerMessage(tm, T0 + MIN).title, "Time's up");
  assert.equal(timerMessage({ ...tm, sent: T0 }, T0 + MIN), null);
  assert.equal(timerMessage(tm, T0 + 60 * MIN), null);
  assert.equal(timerMessage({ id: "", end: 0 }, T0), null);
});

test("text", () => {
  assert.equal(countdownText(25 * MIN), "25:00");
  assert.equal(countdownText(61 * MIN + 5000), "1:01:05");
  assert.equal(durationText(70), "1h 10m");
  assert.equal(durationText(120), "2h");
});
