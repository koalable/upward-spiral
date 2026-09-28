// Small, dependency-free helpers: numbers, paths, dates, times, and safe HTML.

// ---------- values ----------
export const toNum = (v) => Number(v) || 0;
export const isSet = (v) => v !== undefined && v !== null && v !== "";
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  for (const k of keys) {
    if (!obj[k] || typeof obj[k] !== "object") obj[k] = {};
    obj = obj[k];
  }
  if (value === undefined) delete obj[last];
  else obj[last] = value;
}

// ---------- dates (keys are local "YYYY-MM-DD" strings) ----------
const pad = (n) => String(n).padStart(2, "0");
export const pad2 = pad;
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => dateKey(new Date());
export const addDays = (key, n) => { const d = parseKey(key); d.setDate(d.getDate() + n); return dateKey(d); };
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86_400_000);
export const weekStart = (key) => { const d = parseKey(key); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); };
export const monthKey = (key) => key.slice(0, 7);
export const monthLength = (mk) => { const [y, m] = mk.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export function dateRange(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
export const weekOf = (key) => { const w = weekStart(key); return dateRange(w, addDays(w, 6)); };
export const monthDays = (mk) => dateRange(`${mk}-01`, `${mk}-${pad(monthLength(mk))}`);

const fmt = (key, opts) => parseKey(key).toLocaleDateString(undefined, opts);
export const longDate = (key) => fmt(key, { weekday: "long", month: "long", day: "numeric" });
export const shortDate = (key) => fmt(key, { month: "short", day: "numeric" });
export const weekday = (key) => fmt(key, { weekday: "short" });
export const monthName = (mk) => fmt(`${mk}-01`, { month: "long" });

// ---------- clock times ----------
export const minutesOf = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const clock = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const hhmmOf = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function atTime(key, hhmm) {
  const d = parseKey(key);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
export function duration(ms) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  return `${h ? h + "h " : ""}${mins % 60}m`;
}

// ---------- safe HTML ----------
// `html` escapes every interpolated value unless it is already Html (from html`` or raw()).
// Arrays are joined; null/undefined/false render as nothing.
class Html { constructor(s) { this.s = s; } toString() { return this.s; } }
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeText = (v) => String(v).replace(/[&<>"']/g, (c) => ENTITIES[c]);
function render(v) {
  if (v == null || v === false) return "";
  if (v instanceof Html) return v.s;
  if (Array.isArray(v)) return v.map(render).join("");
  return escapeText(v);
}
export const raw = (s) => new Html(String(s));
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new Html(out);
}
