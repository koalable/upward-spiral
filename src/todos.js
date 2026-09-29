// To-dos: one private list; each item may have a "do on" date and/or a "due" date. Pure: data in, lists out.
// One doc, users/{uid}/lists/todos: { items: [{ id, t, on, due, done, created }] }   done = date finished, or ""
// Older data lived in users/{uid}/goals/d<date> | w<week> | m<month>; fromGoals() carries it over once.
import { addDays, weekStart, monthKey, monthLength } from "./util.js";

export const normalizeTodos = (doc) => ({ items: Array.isArray(doc?.items) ? doc.items : [] });

const weekEnd = (key) => addDays(weekStart(key), 6);
const monthEnd = (key) => `${monthKey(key)}-${String(monthLength(monthKey(key))).padStart(2, "0")}`;

// The earliest date that matters for an item: when you plan to do it, or its deadline.
export const whenOf = (x) => [x.on, x.due].filter(Boolean).sort()[0] || "";
export const isOverdue = (x, today) => !x.done && Boolean(x.due) && x.due < today;

// Today = planned for today or earlier, or due today or earlier. Plus anything finished today.
export const isToday = (x, today) => (x.done ? x.done === today : Boolean(whenOf(x)) && whenOf(x) <= today);

const byWhen = (a, b) => (a.due && b.due && a.due !== b.due ? a.due.localeCompare(b.due) : 0)
  || whenOf(a).localeCompare(whenOf(b)) || String(a.created || "").localeCompare(String(b.created || ""));

// Groups for the To-dos tab. Finished items stay visible on the day they're done, then drop into "Done".
export function buckets(items, today) {
  const out = { today: [], week: [], month: [], later: [], someday: [], done: [] };
  for (const x of items) {
    if (x.done && x.done !== today) { out.done.push(x); continue; }
    const w = whenOf(x);
    if (isToday(x, today)) out.today.push(x);
    else if (!w) out.someday.push(x);
    else if (w <= weekEnd(today)) out.week.push(x);
    else if (w <= monthEnd(today)) out.month.push(x);
    else out.later.push(x);
  }
  for (const k of Object.keys(out)) out[k].sort(byWhen);
  out.done.sort((a, b) => b.done.localeCompare(a.done));
  // Overdue first, then due today, then the rest, then what's finished today.
  const rank = (x) => (x.done ? 3 : isOverdue(x, today) ? 0 : x.due === today ? 1 : 2);
  out.today.sort((a, b) => rank(a) - rank(b) || byWhen(a, b));
  return out;
}

// Check-in dashboard: today's list, plus the rest of this week (open items only).
export function dashboard(items, today) {
  const b = buckets(items, today);
  return { today: b.today, week: b.week };
}

// One-time carry-over from the three old lists.
export function fromGoals(goals) {
  const items = [];
  for (const [key, doc] of Object.entries(goals || {})) {
    const kind = key[0], date = key.slice(1);
    if (!/^[dwm]\d{4}-\d{2}/.test(key)) continue;
    (doc?.items || []).forEach((g, i) => {
      if (!g?.t) return;
      const item = { id: `g${key}-${i}`, t: g.t, on: "", due: "", done: "", created: date };
      if (kind === "d") item.on = date;
      if (kind === "w") item.due = weekEnd(date);
      if (kind === "m") item.due = monthEnd(`${date}-01`);
      if (g.done) item.done = kind === "d" ? date : item.due;
      items.push(item);
    });
  }
  return { items, migrated: true };
}

// Short label for a date relative to today: "Today", "Tomorrow", "Fri", "Oct 3".
export function dayLabel(key, today) {
  if (!key) return "";
  if (key === today) return "today";
  if (key === addDays(today, 1)) return "tomorrow";
  if (key === addDays(today, -1)) return "yesterday";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const inWeek = key > today && key <= addDays(today, 6);
  return date.toLocaleDateString("en-US", inWeek ? { weekday: "short" } : { month: "short", day: "numeric" });
}
