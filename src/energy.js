// Energy flow: every scored category belongs to one of four themed groups, and a tile's shade shows momentum.
import { addDays, weekStart, dateRange } from "./util.js";

export const GROUPS = [
  { id: "fill", name: "Fill up", theme: "garden", themeName: "Garden", icon: "sprout", why: "What puts energy back in the tank." },
  { id: "protect", name: "Protect", theme: "tide", themeName: "Tide", icon: "shield", why: "Guarding against the leaks." },
  { id: "spend", name: "Spend well", theme: "ember", themeName: "Ember", icon: "flame", why: "Where your energy goes on purpose." },
  { id: "show", name: "Show up", theme: "dusk", themeName: "Dusk", icon: "sparkles", why: "The habit that holds the rest together." },
];
export const groupById = (id) => GROUPS.find((g) => g.id === id) || GROUPS[2];

const BUILTIN_GROUP = { sleep: "fill", diet: "fill", practices: "fill", substances: "protect", screen: "protect", movement: "spend", writing: "spend", reading: "spend" };
const BUILTIN_ICON = { sleep: "moon", diet: "salad", practices: "leaf", substances: "wine-off", screen: "smartphone", movement: "footprints", writing: "pen-line", reading: "book-open" };

export const groupOf = (q) => groupById(q.group || BUILTIN_GROUP[q.id] || "spend");
export const iconOf = (q) => q.icon || BUILTIN_ICON[q.id] || "circle-dot";
export const themeOf = (q) => groupOf(q).theme;

// 0 slipping · 1 dipping · 2 steady · 3 rising · 4 surging
export const MOMENTUM = ["Slipping", "Dipping", "Steady", "Rising", "Surging"];
export function momentum(now, before) {
  if (!before) return now > 0 ? 4 : 2;
  const change = (now - before) / before;
  return change > 0.2 ? 4 : change > 0.05 ? 3 : change >= -0.05 ? 2 : change >= -0.2 ? 1 : 0;
}

// Which days to compare. Early in the week, only the same weekdays count, so Tuesday isn't judged against a whole week.
// If nothing is in yet this week (e.g. Monday morning), the window is last week, compared with the three before it.
export function windows(today, hasToday, weeks = 6) {
  let start = weekStart(today), n = dateRange(start, today).length - (hasToday ? 0 : 1);
  if (n <= 0) { start = addDays(start, -7); n = 7; }
  const out = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const s = addDays(start, -7 * k);
    out.push(dateRange(s, addDays(s, n - 1)));
  }
  return { windows: out, days: n, lastWeek: start !== weekStart(today) };
}

// values: one number per window, oldest first; the last is now.
export function trend(values) {
  const now = values[values.length - 1], prev = values.slice(-4, -1);
  const avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;
  const before = values[values.length - 2] ?? 0;
  return { now, before, avg, level: momentum(now, avg) };
}
