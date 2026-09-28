// Every tunable number and fixed list lives here.

export const APP_NAME = "Upward Spiral of Awesomeness";

export const POINTS_PER_CATEGORY = 4;
export const SCALED_POINTS = 32; // category points are scaled to this
export const CHECK_IN_POINTS = 1;
export const MAX_DAILY = SCALED_POINTS + CHECK_IN_POINTS; // 33

export const HISTORY_DAYS = 120; // how far back scores and entries load
export const MEDLOG_DAYS = 30;
export const SEASON_DAYS = 42; // six weeks
export const SEASON_BREAK_DAYS = 3;
export const MAX_FREEZES = 2;
export const YESTERDAY_CUTOFF_HOUR = 18; // yesterday can be edited until 6 pm today
const hour12 = YESTERDAY_CUTOFF_HOUR % 12 || 12;
export const EDIT_WINDOW_TEXT = `Log or edit today any time, and yesterday until ${hour12} ${YESTERDAY_CUTOFF_HOUR < 12 ? "am" : "pm"}.`;

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const TOAST_MS = 10_000;
export const SAVE_DELAY_MS = 700;
export const TEXT_SIZES = [16, 18, 20, 22, 24];

export const DEFAULT_TARGETS = {
  bedTarget: "23:00", wakeTarget: "07:00", calTarget: 2200, proteinTarget: 120,
  weekPts: 140, writeMin: 60, readMin: 30, customPractice: "",
  substanceLimit: 0, substanceRule: "", reminder: "21:00",
};

export const SCREEN_HABITS = [
  ["noPhoneWake", "Phone stayed out of bed on waking"],
  ["noPhoneSleep", "Phone stayed out of bed before sleep"],
  ["lowScroll", "Under 15 min of mindless scrolling"],
  ["lowEnt", "Under 2 hrs of entertainment"],
];

export const WORKOUTS = [["gym", "Gym"], ["stretch", "Stretching"], ["other", "Other workout"]];

// One description per built-in, used both on the Today card and in "How scoring works".
export const BUILTINS = {
  writing: { name: "Writing", rule: "15 min 1 point, 30 min 2, 60 min 3, 120 min 4." },
  reading: { name: "Reading", rule: "1 point per 15 minutes, up to an hour." },
  sleep: { name: "Sleep", rule: "Bedtime and wake time, 2 points each: within 30 min of target 2, within 60 min 1. Earlier is fine." },
  diet: { name: "Diet", rule: "Within 200 calories of target 2. Fruit and veg or protein goal 2. Processed sugar and food cost 1, or 2 if excess." },
  substances: { name: "Substances", rule: "At or under your daily limit 4, one over 2." },
  movement: { name: "Movement", rule: "Walking: 5k steps or 15 min 1, 8k or 30 min 2. Workout: 15 min 1, over 20 min 2." },
  screen: { name: "Screen time", rule: "1 point for each of four phone and screen habits." },
  practices: { name: "Healthy practices", rule: "Log what you did, then grade your own effort 0 to 4." },
};
export const BUILTIN_ORDER = Object.keys(BUILTINS);

export const QUESTION_KINDS = {
  check: "Checklist",
  number: "Number with a target",
  scale: "Rate yourself 0–4",
  text: "Note (not scored)",
  ladder: "Level-up habit (weekly goal)",
};

export const MED_KINDS = { rx: "Prescription", otc: "Over the counter", supp: "Supplement", sub: "Substance" };

// Level-up habits (weekly goals that grow)
export const WEEK_GOAL_BONUS = 5;
export const LEVEL_UP_BONUS = 15;
export const DEFAULT_WEEKS_TO_LEVEL = 2;
export const MAX_DAILY_BONUS = 40;
export const LADDER_TEMPLATES = {
  weekly: { name: "Exercise", mode: "days", levels: [{ days: 2 }, { days: 3 }, { days: 4 }] },
  minutes: { name: "Exercise", mode: "minutes", levels: [{ days: 5, minutes: 5 }, { days: 5, minutes: 10 }, { days: 5, minutes: 15 }] },
};
