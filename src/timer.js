// Work task timer: counts down from what's left of a task's estimate. Pure: work doc in, work doc out.
// One timer at a time, kept in the work doc (users/{uid}/lists/work):
//   timer: { id, start, end }   running: started at `start` (ms), rings at `end` (ms)
//   timer: { id, left }         paused: `left` ms to go
// Time on a task adds up in task.spent (minutes), counted only up to when the timer ran out.

export const DEFAULT_MIN = 25;   // no estimate: one focus session
export const OVERTIME_MIN = 15;  // estimate already used up: another short stretch
export const EXTRA_MIN = 10;     // "+10 min" when time's up

const MIN = 60_000;

// Minutes of the estimate not yet spent.
export function minutesLeft(t) {
  const est = (Number(t?.hours) || 0) * 60, spent = Number(t?.spent) || 0;
  if (!est) return DEFAULT_MIN;
  const left = Math.round(est - spent);
  return left > 0 ? left : OVERTIME_MIN;
}

export const timerFor = (w, id) => (w.timer?.id === id ? w.timer : null);
export const isRunning = (tm) => Boolean(tm?.end);
export const msLeft = (tm, now) => (tm ? (tm.end ? Math.max(0, tm.end - now) : Math.max(0, tm.left || 0)) : 0);
export const isUp = (tm, now) => Boolean(tm?.end && now >= tm.end);

// Adds the running stretch (up to the ring) to the task's time spent.
function credit(w, now) {
  const tm = w.timer;
  if (!tm?.end) return;
  const t = w.tasks.find((x) => x.id === tm.id);
  if (!t) return;
  const ran = Math.max(0, Math.min(now, tm.end) - tm.start);
  t.spent = Math.round(((Number(t.spent) || 0) + ran / MIN) * 10) / 10;
}

// Starting a task's timer stops any other one first.
export function startTimer(w, id, now) {
  const t = w.tasks.find((x) => x.id === id);
  if (!t) return w;
  const own = timerFor(w, id);
  if (own && isRunning(own)) return w;
  if (w.timer) stopTimer(w, now);
  const left = own && own.left > 0 ? own.left : minutesLeft(t) * MIN;
  w.timer = { id, start: now, end: now + left };
  return w;
}

export function pauseTimer(w, now) {
  const tm = w.timer;
  if (!tm?.end) return w;
  credit(w, now);
  w.timer = { id: tm.id, left: Math.max(0, tm.end - now) };
  return w;
}

export function stopTimer(w, now) {
  credit(w, now);
  delete w.timer;
  return w;
}

// Time's up and you want a bit longer.
export function addTime(w, now, minutes = EXTRA_MIN) {
  const tm = w.timer;
  if (!tm) return w;
  credit(w, now);
  w.timer = { id: tm.id, start: now, end: now + Math.max(msLeft(tm, now), 0) + minutes * MIN };
  return w;
}

// "12:05" or "1:02:05"
export function countdownText(ms) {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}

// "1h 10m", "25m", "2h"
export function durationText(minutes) {
  const m = Math.round(Number(minutes) || 0), h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}
