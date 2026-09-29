// Pure scoring: settings in, points out. No DOM, no storage, no clock.
import {
  BUILTINS, BUILTIN_ORDER, DEFAULT_TARGETS, SCREEN_HABITS, WORKOUTS,
  POINTS_PER_CATEGORY, SCALED_POINTS, CHECK_IN_POINTS,
} from "./constants.js";
import { toNum, isSet, minutesOf } from "./util.js";

// ---------- settings ----------
export function defaultSettings() {
  return {
    cats: BUILTIN_ORDER.map((id) => ({ id, kind: "builtin", scored: true })),
    lead: "writing",
    floor: ["writing", "reading", "screen"],
    targets: { ...DEFAULT_TARGETS },
    meds: [],
  };
}

// Fills in anything missing. Mutates and returns the same object so callers can keep references.
export function normalizeSettings(s) {
  s = s || defaultSettings();
  s.targets = { ...DEFAULT_TARGETS, ...(s.targets || {}) };
  s.cats = s.cats || defaultSettings().cats;
  s.floor = s.floor || [];
  s.meds = s.meds || [];
  return s;
}

export const isScored = (q) => q.scored && q.kind !== "text" && q.kind !== "ladder";
export const scoredQuestions = (cfg) => (cfg.cats || []).filter(isScored);
export const questionName = (q) => (q.kind === "builtin" ? BUILTINS[q.id].name : q.name);

// Plain-language rule for any question; one source of truth for cards and the rules list.
export function questionRule(q) {
  if (q.kind === "builtin") return BUILTINS[q.id].rule;
  const unit = q.unit ? ` ${q.unit}` : "";
  switch (q.kind) {
    case "check": return (q.items || []).length > 1 ? "Points are split evenly across your items." : "Done earns 4.";
    case "number": return q.dir === "max"
      ? `At or under ${toNum(q.target)}${unit} earns 4.`
      : `Reaching ${toNum(q.target)}${unit} earns 4, partial credit below.`;
    case "scale": return "Grade yourself 0 to 4.";
    case "ladder": return `Not part of your daily score. Hit your weekly goal for a +5 bonus; hit it ${q.weeksToLevel || 2} weeks in a row for +15 and the next level.`;
    default: return "";
  }
}

// ---------- built-in categories ----------
export function sleepPoints(actual, target) {
  if (!actual || !target) return 0;
  let diff = (((minutesOf(actual) - minutesOf(target)) % 1440) + 1440) % 1440;
  if (diff >= 720) diff -= 1440; // negative = earlier than target, which is fine
  return diff <= 30 ? 2 : diff <= 60 ? 1 : 0;
}
export const writingMinutes = (a) => (a?.sessions || []).reduce((sum, s) => sum + toNum(s.m), 0);
export const workoutMinutes = (a) => WORKOUTS.reduce((sum, [id]) => sum + toNum(a?.ex?.[id]), 0);

function builtinPoints(id, a, t, detail) {
  switch (id) {
    case "writing": {
      const m = writingMinutes(a);
      return m >= 120 ? 4 : m >= 60 ? 3 : m >= 30 ? 2 : m >= 15 ? 1 : 0;
    }
    case "reading": return Math.min(4, Math.floor(toNum(a.reading) / 15));
    case "sleep":
      detail.bed = sleepPoints(a.bed, t.bedTarget);
      detail.wake = sleepPoints(a.wake, t.wakeTarget);
      return detail.bed + detail.wake;
    case "diet": {
      let pts = 0;
      const cal = toNum(a.calories), protein = toNum(a.protein);
      if (cal > 0 && Math.abs(cal - toNum(t.calTarget)) <= 200) pts += 2;
      if (a.fruitVeg || (protein > 0 && protein >= toNum(t.proteinTarget))) pts += 2;
      return Math.max(0, pts - toNum(a.sugar) - toNum(a.processed));
    }
    case "substances": {
      if (!isSet(a.substances)) return 0; // unanswered is not "zero units"
      const over = toNum(a.substances) - toNum(t.substanceLimit);
      return over <= 0 ? 4 : over <= 1 ? 2 : 0; // halves allowed: up to one unit over earns 2
    }
    case "movement": {
      const steps = toNum(a.steps), walk = toNum(a.walkMin), workout = workoutMinutes(a);
      detail.walk = steps >= 8000 || walk >= 30 ? 2 : steps >= 5000 || walk >= 15 ? 1 : 0;
      detail.workout = workout > 20 ? 2 : workout >= 15 ? 1 : 0;
      return detail.walk + detail.workout;
    }
    case "screen": return SCREEN_HABITS.filter(([key]) => a[key]).length;
    case "practices": return Math.min(4, toNum(a.effort));
    default: return 0;
  }
}

// ---------- custom questions ----------
export function customPoints(q, answers) {
  const v = answers.c?.[q.id];
  switch (q.kind) {
    case "check": {
      const n = (q.items || []).length;
      if (!n || !v) return 0;
      const done = q.items.filter((_, i) => v[i]).length;
      return Math.floor((4 * done) / n + 1e-9);
    }
    case "number": {
      if (!isSet(v)) return 0;
      const value = toNum(v), target = toNum(q.target);
      if (q.dir === "max") return value <= target ? 4 : Math.floor((4 * target) / value);
      if (target <= 0) return value > 0 ? 4 : 0;
      return Math.min(4, Math.floor((4 * value) / target + 1e-9));
    }
    case "scale": return isSet(v) ? Math.max(0, Math.min(4, toNum(v))) : 0;
    default: return 0;
  }
}

// ---------- a whole day ----------
// A day stores the question config it was scored with (day.cfg), so later edits never rewrite history.
export function scoreDay(day, currentCfg) {
  const result = {
    total: 0, points: {}, detail: { bed: 0, wake: 0, walk: 0, workout: 0 },
    logged: false, leadMet: false, floorMet: false, showedUp: false, streakDay: false,
  };
  if (!day?.logged) return result;

  const cfg = day.cfg || currentCfg;
  const a = day.a || {};
  const targets = { ...DEFAULT_TARGETS, ...(cfg.targets || {}) };
  const questions = scoredQuestions(cfg);

  let earned = 0;
  for (const q of questions) {
    const pts = q.kind === "builtin" ? builtinPoints(q.id, a, targets, result.detail) : customPoints(q, a);
    result.points[q.id] = pts;
    earned += pts;
  }
  const possible = questions.length * POINTS_PER_CATEGORY;
  result.logged = true;
  result.total = (possible ? Math.round((earned / possible) * SCALED_POINTS) : 0) + CHECK_IN_POINTS;

  const lead = cfg.lead in result.points ? cfg.lead : null;
  result.leadMet = lead ? result.points[lead] >= 1 : true;

  const floor = (cfg.floor || []).filter((id) => id in result.points);
  result.floorMet = floor.length ? floor.every((id) => result.points[id] >= 1) : result.leadMet;

  const excused = Boolean(a.dayOff || a.freeze);
  result.streakDay = result.leadMet || excused;
  result.showedUp = result.floorMet || excused;
  return result;
}

// ---------- converting a built-in into an editable question ----------
export function builtinAsCustom(id, targets) {
  const base = { id, name: BUILTINS[id].name, scored: true, origin: "builtin" };
  const check = (items) => ({ ...base, kind: "check", items });
  const number = (dir, unit, target, step) => ({ ...base, kind: "number", dir, unit, target, step });
  switch (id) {
    case "writing": return number("min", "min", 120, 15);
    case "reading": return number("min", "min", 60, 15);
    case "substances": return number("max", "units", toNum(targets.substanceLimit), 1);
    case "sleep": return check([`In bed by ${targets.bedTarget}`, `Up by ${targets.wakeTarget}`]);
    case "diet": return check(["Within my calorie target", "Hit protein or fruit & veg goal", "No processed sugar", "No processed food"]);
    case "movement": return check(["Walked 30 min or 8k steps", "Worked out 20+ min"]);
    case "screen": return check(SCREEN_HABITS.map(([, label]) => label));
    case "practices": return check(["Journaling", "Mindfulness / meditation", ...(targets.customPractice ? [targets.customPractice] : [])]);
    default: return check([]);
  }
}
