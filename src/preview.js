// Pretend data for preview mode only; not included in the live bundles.
import { todayKey, addDays, dateRange, weekStart } from "./util.js";

export function seedPreview(db) {
  const today = todayKey();
  [["demo-ada", "Ada"], ["demo-bea", "Bea"]].forEach(([uid, name], i) => {
    db.docs[`members/${uid}`] = { uid, name, joined: addDays(today, -20), freezes: i };
    dateRange(addDays(today, -13), addDays(today, -1)).forEach((d, j) => {
      if ((j + i) % 6 === 5) return;
      const total = 14 + ((j * 7 + i * 5) % 17);
      db.docs[`scores/${uid}_${d}`] = { uid, date: d, total, logged: true, showed: total > 16, streak: total > 15, updated: 0, doneAt: Date.now() - (j + 1) * 86_400_000 };
    });
  });
  const week = weekStart(today);
  db.docs[`wins/demo-ada_${week}`] = { uid: "demo-ada", week, text: "Walked to the market three mornings in a row." };

  // You: a few weeks of check-ins and routines, so the streak calendars have something to show.
  const since = addDays(today, -40);
  db.docs["members/preview"] = { uid: "preview", name: "You", joined: since, freezes: 1 };
  dateRange(since, addDays(today, -1)).forEach((d, j) => {
    if (j % 9 === 4) return;
    const total = 12 + ((j * 5) % 20);
    db.docs[`scores/preview_${d}`] = { uid: "preview", date: d, total, logged: true, showed: j % 7 !== 2, streak: true, updated: 0 };
  });
  const items = [
    { id: "r1", name: "Make bed", icon: "🛏️", group: "morning", days: [0, 1, 2, 3, 4, 5, 6], times: 1, since },
    { id: "r2", name: "Meditate", icon: "🧘", group: "morning", days: [0, 1, 2, 3, 4, 5, 6], times: 1, minutes: 10, since },
    { id: "r3", name: "Clear inbox", icon: "📥", group: "afternoon", days: [1, 2, 3, 4, 5], times: 1, since },
    { id: "r4", name: "Pitch or post", icon: "📣", group: "afternoon", perWeek: 3, times: 1, since },
    { id: "r5", name: "Take vitamins", icon: "💊", group: "evening", days: [0, 1, 2, 3, 4, 5, 6], times: 2, since },
  ];
  db.docs["users/preview/lists/routines"] = { items };
  const at = (n) => addDays(today, n);
  db.docs["users/preview/lists/work"] = {
    goals: [{ id: "g1", name: "Book marketing launch", due: at(300) }],
    milestones: [{ id: "m1", goal: "g1", name: "Build email list", due: at(20) }, { id: "m2", goal: "g1", name: "Pitch podcasts", due: at(50) }],
    tasks: [
      { id: "t1", goal: "g1", ms: "m1", name: "Set up Substack welcome email", due: at(-2), hours: 2, done: at(-3), created: 1 },
      { id: "t2", goal: "g1", ms: "m1", name: "Write lead magnet", due: at(-1), hours: 4, spent: 70, after: "t1", done: "", created: 2 },
      { id: "t3", goal: "g1", ms: "m1", name: "Add signup form to kstarr.com", due: at(3), hours: 1, after: "t2", done: "", created: 3 },
      { id: "t4", goal: "g1", ms: "m1", name: "Draft 3 welcome posts", due: at(5), hours: 3, done: "", created: 4 },
      { id: "t5", goal: "g1", ms: "m2", name: "List 30 target podcasts", due: at(10), hours: 3, done: "", created: 5 },
      { id: "t6", goal: "g1", ms: "m2", name: "Write pitch template", due: at(0), at: "14:00", hours: 1, done: "", created: 6 },
      { id: "t7", goal: "g1", ms: "", name: "Update author bio", due: "", hours: 0.5, done: "", created: 7 },
    ],
  };
  dateRange(since, addDays(today, -1)).forEach((d, j) => {
    const done = {};
    items.forEach((r, k) => { if ((j * 3 + k * 5) % 11 > 2 + (k % 3)) done[r.id] = r.times; });
    db.docs[`users/preview/routinelog/${d}`] = { date: d, done };
  });
}
