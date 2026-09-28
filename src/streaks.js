// Streak calendars: turn "how did this area go each day" into runs, milestones, and badges.
// A day's status is "all", "some", "none", or null when nothing was due (a rest day for that area:
// it neither breaks nor extends a run).

export const BADGES = [
  [1, "Ideal Day"], [3, "Tiptop Triple"], [7, "Wonderful Week"], [14, "Fantastic Fortnight"],
  [30, "Marvelous Month"], [60, "Sixty Strong"], [100, "Century"],
];
const STAR_AT = new Set(BADGES.map(([n]) => n).filter((n) => n > 1));

// dates: ascending keys ending today. statusOf(date) → "all" | "some" | "none" | null.
export function runs(dates, statusOf) {
  const byDay = {};
  let run = 0, best = 0, beforeToday = 0;
  const today = dates[dates.length - 1];
  for (const d of dates) {
    const status = statusOf(d);
    if (d === today) beforeToday = run;
    if (status === "all") run++;
    else if (status !== null && d !== today) run = 0; // today isn't over yet
    best = Math.max(best, run);
    byDay[d] = { status, star: status === "all" && STAR_AT.has(run) };
  }
  const todayAll = byDay[today]?.status === "all";
  return { byDay, current: todayAll ? run : beforeToday, best };
}

export const earned = (best) => BADGES.filter(([n]) => best >= n);
export const nextBadge = (best) => BADGES.find(([n]) => best < n) || null;
