// Work: big goals broken into milestones and tasks, and a short list of what to do today. Private to each person.
// One doc, users/{uid}/lists/work:
//   goals:      [{ id, name, due }]
//   milestones: [{ id, goal, name, due }]
//   tasks:      [{ id, goal, ms, name, due, at, hours, spent, after, done, created }]
//               done = date finished, or ""; at = start time "HH:MM" (optional); spent = minutes on the timer
//   timer:      the one running or paused task timer (src/timer.js)
//   today:      { date, pins: [ids], skips: [ids], extra }                   resets each day
//   perDay:     how many tasks Today shows (3–5)
import { daysBetween } from "./util.js";

export function normalizeWork(doc) {
  return {
    goals: Array.isArray(doc?.goals) ? doc.goals : [],
    milestones: Array.isArray(doc?.milestones) ? doc.milestones : [],
    tasks: Array.isArray(doc?.tasks) ? doc.tasks : [],
    today: doc?.today || {},
    perDay: Math.min(5, Math.max(3, Number(doc?.perDay) || 3)),
    archived: Array.isArray(doc?.archived) ? doc.archived : [],
    slips: Array.isArray(doc?.slips) ? doc.slips : [],
    ...(doc?.timer ? { timer: doc.timer } : {}),
  };
}

// ---------- Tidy up: tasks more than a week late get pushed back, archived or marked done, with a reason ----------
//   archived: [task + { archived: date, why }]   off every list, kept for the record
//   slips:    [{ at, date, task, name, goal, late (days), action: "pushed"|"archived"|"done", why, note, from, to }]
//             a log of what happened to late tasks and why, for spotting patterns later
export const STALE_DAYS = 7;
export const PUSH_WHYS = [["longer", "Took longer than planned"], ["waiting", "Waiting on someone"], ["toobig", "Too big, needs breaking down"], ["forgot", "Forgot about it"], ["priorities", "Other things came first"], ["life", "Life happened"]];
export const ARCHIVE_WHYS = [["unneeded", "Not needed any more"], ["someone", "Someone else did it"], ["notworth", "Not worth the effort"], ["plans", "Plans changed"], ["replan", "Too big, I'll re-plan it"], ["other", "Something else"]];

export const staleTasks = (w, key) => w.tasks
  .filter((t) => !t.done && t.due && daysBetween(t.due, key) > STALE_DAYS)
  .sort((a, b) => a.due.localeCompare(b.due));

// Records what happened to a late task. action: "pushed" (to = new due date), "archived" or "done".
export function resolveStale(w, id, { action, why = "", note = "", to = "" }, key, now = Date.now()) {
  const t = w.tasks.find((x) => x.id === id);
  if (!t) return w;
  w.slips.push({ at: now, date: key, task: t.id, name: t.name, goal: t.goal, late: daysBetween(t.due, key), action, why, ...(note ? { note } : {}), from: t.due, ...(to ? { to } : {}) });
  if (action === "pushed") { t.due = to; t.pushes = (t.pushes || 0) + 1; }
  else if (action === "done") t.done = key;
  else if (action === "archived") {
    removeTask(w, t.id);
    w.archived.push({ ...t, archived: key, why });
    if (w.timer?.id === t.id) delete w.timer;
  }
  return w;
}

export const todayState = (w, key) => (w.today?.date === key ? w.today : { date: key, pins: [], skips: [], extra: 0 });

// A task waits until the task it depends on is done.
export function blocker(t, tasks) {
  if (!t.after) return null;
  const b = tasks.find((x) => x.id === t.after);
  return b && !b.done ? b : null;
}

// Most urgent first: overdue, then soonest due, then undated, then oldest.
const urgency = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || String(a.created || "").localeCompare(String(b.created || ""));

// Goals on a breathing-room pause (w.pausedGoals, set by the app) sit out of today's list.
// Today's list: pinned tasks and tasks with a start time due today, then the most urgent unblocked open tasks.
// Tasks finished today stay on the list (checked), so finishing doesn't pull in more until you ask.
// Anything with a start time goes to the top, earliest first.
export function todayPicks(w, key) {
  const t = todayState(w, key), size = w.perDay + (t.extra || 0);
  const doneToday = w.tasks.filter((x) => x.done === key);
  const open = w.tasks.filter((x) => !x.done && !blocker(x, w.tasks) && !(w.pausedGoals || []).includes(x.goal));
  const pinned = (t.pins || []).map((id) => open.find((x) => x.id === id)).filter(Boolean);
  const timed = open.filter((x) => x.at && x.due === key && !pinned.includes(x));
  const rest = open.filter((x) => !pinned.includes(x) && !timed.includes(x) && !(t.skips || []).includes(x.id)).sort(urgency);
  const picks = [...doneToday, ...pinned, ...timed];
  for (const x of rest) { if (picks.length >= size) break; picks.push(x); }
  return picks.map((x, i) => [x, i]).sort(([a, i], [b, j]) => (a.at || "99").localeCompare(b.at || "99") || i - j).map(([x]) => x);
}

// Progress for a set of tasks. Behind = anything overdue.
export function progress(tasks, key) {
  const total = tasks.length, done = tasks.filter((x) => x.done).length;
  const overdue = tasks.filter((x) => !x.done && x.due && x.due < key).length;
  const hoursLeft = tasks.filter((x) => !x.done).reduce((s, x) => s + (Number(x.hours) || 0), 0);
  const spent = tasks.reduce((s, x) => s + (Number(x.spent) || 0), 0);
  return { total, done, pct: total ? Math.round((100 * done) / total) : 0, overdue, hoursLeft, spent };
}

export const daysLeft = (due, key) => (due ? daysBetween(key, due) : null);

export function countdown(due, key) {
  const n = daysLeft(due, key);
  if (n === null) return "No deadline";
  if (n < 0) return `${-n} day${n === -1 ? "" : "s"} past due`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 60) return `${n} days left`;
  return `${Math.round(n / 7)} weeks left`;
}

// Removing a task frees anything that waited on it.
export function removeTask(w, id) {
  w.tasks = w.tasks.filter((x) => x.id !== id);
  w.tasks.forEach((x) => { if (x.after === id) delete x.after; });
}
export function removeMilestone(w, id) {
  w.tasks.filter((x) => x.ms === id).forEach((x) => removeTask(w, x.id));
  w.milestones = w.milestones.filter((m) => m.id !== id);
}
export function removeGoal(w, id) {
  w.tasks.filter((x) => x.goal === id).forEach((x) => removeTask(w, x.id));
  w.milestones = w.milestones.filter((m) => m.goal !== id);
  w.goals = w.goals.filter((g) => g.id !== id);
}

// Each goal gets its own colour, in order, so its tasks are easy to spot everywhere (classes gc1–gc7 in ui.css:
// jewel tones in dark mode, earthy in light mode).
export const GOAL_THEMES = ["gc1", "gc2", "gc3", "gc4", "gc5", "gc6", "gc7"];
// Colours start greyed and deepen as work gets done: 35% saturation at 0%, full at 100%.
export const saturation = (pct) => (0.35 + (0.65 * Math.max(0, Math.min(100, pct || 0))) / 100).toFixed(2);
export const goalTheme = (w, goalId) => {
  const i = w.goals.findIndex((g) => g.id === goalId);
  return i < 0 ? GOAL_THEMES[0] : GOAL_THEMES[i % GOAL_THEMES.length];
};
// A goal's milestones take the next pastels along, so neighbouring bars differ.
export const milestoneTheme = (w, goalId, n) => {
  const i = Math.max(0, w.goals.findIndex((g) => g.id === goalId));
  return GOAL_THEMES[(i + 1 + n) % GOAL_THEMES.length];
};

// Milestone tile icons (Lucide names). A milestone can pick one; otherwise it's guessed from its name.
export const MS_ICONS = [
  ["luggage", "Suitcase"], ["id-card", "Documents"], ["pill", "Meds"], ["laptop", "Tech"], ["bath", "Toiletries"],
  ["shirt", "Clothes"], ["plane", "Travel"], ["mail", "Email"], ["pen-line", "Writing"], ["book-open", "Reading"],
  ["mic", "Speaking"], ["presentation", "Workshop"], ["megaphone", "Promotion"], ["globe", "Website"], ["code", "Code"],
  ["wallet", "Money"], ["palette", "Design"], ["camera", "Photos"], ["users", "People"], ["phone", "Calls"],
  ["house", "Home"], ["utensils", "Food"], ["shopping-cart", "Shopping"], ["dumbbell", "Fitness"], ["heart", "Health"],
  ["calendar", "Planning"], ["rocket", "Launch"], ["gift", "Gifts"], ["sparkles", "Ideas"], ["notebook-pen", "Notebook"],
  ["briefcase", "Work"], ["dog", "Dog"], ["cat", "Cat"], ["leaf", "Garden"], ["music", "Music"], ["graduation-cap", "School"],
  ["flag", "Milestone"],
];
const GUESS = [
  [/pack|luggage|suitcase|bag/, "luggage"], [/doc|passport|visa|paper|form|ticket|id\b/, "id-card"],
  [/med|pill|pharm|prescri/, "pill"], [/tech|laptop|computer|charger|phone case|gadget|electronic/, "laptop"],
  [/toilet|bath|shower|skincare|makeup/, "bath"], [/cloth|outfit|wear|shoe|wardrobe/, "shirt"],
  [/travel|flight|trip|hotel|airport/, "plane"], [/email|newsletter|substack|mail|inbox/, "mail"],
  [/dog|puppy|daisy|walkies/, "dog"], [/cat|kitten/, "cat"], [/book|proposal|novel|manuscript/, "notebook-pen"],
  [/writ|draft|chapter|essay|edit/, "pen-line"], [/read|research|study|learn/, "book-open"],
  [/podcast|pitch|speak|talk|interview|keynote/, "mic"], [/workshop|class|teach|training|course|slides/, "presentation"],
  [/market|promo|social|launch|announce|post/, "megaphone"], [/web|site|seo|domain/, "globe"], [/app|code|build|dev/, "code"],
  [/money|budget|financ|pay|invoice|tax|bank/, "wallet"], [/design|art|brand|logo/, "palette"], [/photo|video|film/, "camera"],
  [/people|team|client|network|friend|family/, "users"], [/call|phone/, "phone"], [/house|home|clean|tenant|reno|repair/, "house"],
  [/food|meal|cook|grocer|snack/, "utensils"], [/shop|buy|order/, "shopping-cart"], [/gym|fitness|exercise|run|workout|strong|lift|weights/, "dumbbell"],
  [/health|doctor|dentist|therap/, "heart"], [/plan|schedule|calendar/, "calendar"], [/gift|present/, "gift"], [/idea|brainstorm/, "sparkles"],
];
export function guessIcon(name) {
  const n = String(name || "").toLowerCase();
  return GUESS.find(([re]) => re.test(n))?.[1] || "flag";
}
export const msIcon = (m) => m?.icon || guessIcon(m?.name);
// Goals: same list; a goal with nothing to go on gets a target.
export const goalIcon = (g) => g?.icon || (guessIcon(g?.name) === "flag" ? "target" : guessIcon(g?.name));
