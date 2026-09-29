// Notifications: which reminders are due for one person right now. Pure: data in, messages out.
// The server (functions/) runs this every 15 minutes for everyone; the app only edits the choices.
// Choices live in users/{uid}/notify/settings:
//   { tz, tokens: [{ t, ua, at }], checkin: {on,time}, rituals: {on}, meds: {on}, work: {on,time},
//     streak: {on,time}, quiet: {on,from,to}, sent: { date, ids: [] } }
import { minutesOf } from "./util.js";
import { scoreDay, scoredQuestions } from "./scoring.js";
import { normalizeRoutines, inRitual } from "./routines.js";
import { normalizeWork, todayPicks } from "./work.js";
import { pausedIds } from "./breathing.js";
import { habitsDue } from "./rings.js";
import { BUILTINS } from "./constants.js";

export const NOTIFY_DEFAULTS = {
  checkin: { on: true, time: "21:00" },
  rituals: { on: true },
  meds: { on: true },
  work: { on: false, time: "08:30" },
  streak: { on: true, time: "22:00" },
  quiet: { on: false, from: "22:30", to: "07:00" },
};

export function normalizeNotify(doc) {
  const out = { ...(doc || {}) };
  for (const [k, v] of Object.entries(NOTIFY_DEFAULTS)) out[k] = { ...v, ...(doc?.[k] || {}) };
  out.tokens = Array.isArray(doc?.tokens) ? doc.tokens : [];
  return out;
}

// A reminder fires once, within this many minutes after its time (the server runs every 15).
export const CATCH_UP_MIN = 40;

// Local date and minute-of-day for an instant in a time zone.
export function localNow(ms, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), ms };
}

export function inQuiet(q, minutes) {
  if (!q?.on || !q.from || !q.to) return false;
  const a = minutesOf(q.from), b = minutesOf(q.to);
  return a <= b ? minutes >= a && minutes < b : minutes >= a || minutes < b; // wraps past midnight
}

const inWindow = (time, minutes) => {
  if (!time) return false;
  const at = minutesOf(time);
  return minutes >= at && minutes - at < CATCH_UP_MIN;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// data: { settings, day, routines, routinelog (that day's doc), work, medlog (that day's doc) }
// Returns [{ id, title, body, link }] for everything due and not yet sent today.
export function dueNotifications(prefs, data, now, links = {}) {
  const p = normalizeNotify(prefs);
  const { date, minutes } = now;
  if (inQuiet(p.quiet, minutes)) return [];
  const sent = new Set(p.sent?.date === date ? p.sent.ids || [] : []);
  const out = [];
  const add = (id, title, body, link) => { if (!sent.has(id)) out.push({ id, title, body, link }); };
  const cfg = data.settings || {};
  const day = data.day;
  const home = links.checkin || "/";

  // Check-in: until it's finished.
  if (p.checkin.on && inWindow(p.checkin.time, minutes) && !day?.a?.doneAt) {
    add("checkin", "Time to check in", "A couple of minutes to fill in today.", home);
  }

  // Streak saver: only if the streak habit has nothing logged yet (a rest day or freeze counts).
  if (p.streak.on && inWindow(p.streak.time, minutes) && cfg.lead) {
    const r = scoreDay(day, cfg);
    const excused = day?.a?.dayOff || day?.a?.freeze;
    if (!r.leadMet && !excused && scoredQuestions(day?.cfg || cfg).some((q) => q.id === cfg.lead)) {
      const q = (cfg.cats || []).find((c) => c.id === cfg.lead);
      const name = q?.kind === "builtin" ? BUILTINS[q.id]?.name : q?.name;
      add("streak", "Save your streak", `Nothing logged for ${(name || "your streak habit").toLowerCase()} yet today.`, home);
    }
  }

  // Rituals: at each ritual's time, if any of its habits are due and not done.
  if (p.rituals.on) {
    const { items, rituals } = normalizeRoutines(data.routines);
    const log = data.routinelog ? { [date]: data.routinelog } : {};
    for (const r of rituals) {
      if (!r.time || !inWindow(r.time, minutes)) continue;
      const { due, done } = habitsDue(inRitual(items, r.id), date, log);
      if (due > done) add(`ritual:${r.id}`, `${r.name} ritual`, `${plural(due - done, "habit")} to go.`, links.routines || home);
    }
  }

  // Meds: the nth scheduled time, if fewer than n doses are logged today.
  if (p.meds.on) {
    const taken = (id) => (data.medlog?.items || []).filter((x) => x.medId === id).length;
    for (const m of (cfg.meds || []).filter((x) => x.active !== false)) {
      (m.times || []).filter(Boolean).sort().forEach((t, i) => {
        if (inWindow(t, minutes) && taken(m.id) <= i) {
          add(`med:${m.id}:${t}`, `Time for ${m.name}`, [m.dose, m.unit].filter(Boolean).join(" ") || "Tap to log it.", home);
        }
      });
    }
  }

  // Next dose OK: for meds with "hours between doses", once that many hours have passed since the last dose.
  // Uses today's and yesterday's logs (data.medlogPrev) so a late-night dose still counts. Needs now.ms.
  if (p.meds.on && now.ms) {
    const logs = [...(data.medlogPrev?.items || []), ...(data.medlog?.items || [])];
    for (const m of (cfg.meds || []).filter((x) => x.active !== false && Number(x.every) > 0)) {
      const last = logs.filter((x) => x.medId === m.id).sort((a, b) => b.at - a.at)[0];
      if (!last) continue;
      const okAt = last.at + Number(m.every) * 3_600_000;
      if (now.ms >= okAt && now.ms - okAt < CATCH_UP_MIN * 60_000) {
        add(`doseok:${m.id}:${last.at}`, `${m.name}${m.dose ? ` ${m.dose}${m.unit ? " " + m.unit : ""}` : ""} OK now`, "Next dose is OK if you need it.", home);
      }
    }
  }

  // Work: a morning list of today's tasks.
  if (p.work.on && inWindow(p.work.time, minutes)) {
    const picks = todayPicks(normalizeWork(data.work), date, pausedIds(cfg, "goal", date)).filter((t) => !t.done);
    if (picks.length) add("work", `${plural(picks.length, "task")} today`, picks.slice(0, 3).map((t) => t.name).join(" · "), links.work || home);
  }
  return out;
}

// After sending, remember what went out today so nothing repeats.
export const markSent = (prefs, date, ids) => ({
  date, ids: [...new Set([...(prefs?.sent?.date === date ? prefs.sent.ids || [] : []), ...ids])],
});

// Work task timer: the timer in users/{uid}/lists/work ({ id, start, end, sent }) plus the task's name.
// Checked every minute; fires once (sent = end), even in quiet hours (you started it).
export function timerMessage(tm, nowMs, links = {}) {
  if (!tm?.end || tm.sent === tm.end || nowMs < tm.end || nowMs - tm.end > CATCH_UP_MIN * 60_000) return null;
  return { id: `timer:${tm.id}`, title: "Time's up", body: tm.name ? `${tm.name}: done, or a bit longer?` : "Done, or a bit longer?", link: links.work || "/" };
}
