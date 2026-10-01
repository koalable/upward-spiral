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
    { id: "r6", name: "Shower", icon: "🚿", group: "anytime", perWeek: 3, perWeekMax: 4, times: 1, since },
  ];
  db.docs["users/preview/lists/routines"] = { items };
  const at = (n) => addDays(today, n);
  db.docs["users/preview/lists/work"] = {
    goals: [{ id: "g0", name: "Pack for Japan", due: at(6) }, { id: "g1", name: "Book marketing launch", due: at(300) }, { id: "g2", name: "Get strong", due: "" }, { id: "g3", name: "House stuff", due: "" }, { id: "g4", name: "Daisy time", due: "" }],
    milestones: ["Packing", "Docs", "Meds", "Tech", "Toiletries"].map((name, i) => ({ id: `j${i}`, goal: "g0", name, due: at(5) })).concat([{ id: "m1", goal: "g1", name: "Build email list", due: at(20) }, { id: "m2", goal: "g1", name: "Pitch podcasts", due: at(50) }]),
    tasks: [
      ...["Carry-on bag", "Passport + JR pass", "Refill prescriptions", "Chargers + adapter", "Travel-size kit"].map((name, i) => ({ id: `jt${i}`, goal: "g0", ms: `j${i}`, name, due: at(4), hours: 0.5, done: "", created: 10 + i })),
      { id: "jt5", goal: "g0", ms: "j0", name: "Shoes for walking", due: at(4), hours: 0.25, done: at(-1), created: 20 },
      ...[["g2", "Book a trainer", ""], ["g2", "Buy dumbbells", at(-2)], ["g3", "Fix the gutter", ""], ["g4", "Long walk at the coast", at(-4)], ["g4", "Vet check-up", ""]]
        .map(([goal, name, done], i) => ({ id: `x${i}`, goal, ms: "", name, due: "", hours: 1, done, created: 30 + i })),
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
    items.forEach((r, k) => { if (!r.perWeek && (j * 3 + k * 5) % 11 > 2 + (k % 3)) done[r.id] = r.times; });
    if (d < addDays(today, -1) && j % 3 === 0) done.r6 = 1; // showers every few days, none yesterday or today
    db.docs[`users/preview/routinelog/${d}`] = { date: d, done };
  });
}

// ---------- Beta tester: Rosa ----------
// A made-up new person, to try the app as someone other than Karla (preview-rosa-*.html).
// Rosa Delgado, 41, manages 14 rental units in three Portland buildings. Senior dog (Pepper), blood-pressure meds,
// no patience for apps. Set up the way a friend would: Simple layout, "Work" renamed House, only Diet and Sleep
// on the check-in, meds, and a nightly line of reflection. Two weeks in.
export function seedRosa(db) {
  const today = todayKey(), at = (n) => addDays(today, n), since = at(-14);
  const uid = "preview";
  db.docs[`members/${uid}`] = { uid, name: "Rosa", joined: since, freezes: 0 };
  db.docs[`users/${uid}`] = {
    cats: [
      { id: "diet", kind: "builtin", scored: true },
      { id: "sleep", kind: "builtin", scored: true },
      { id: "pepper", kind: "check", scored: true, name: "Pepper", items: ["Morning walk", "Evening walk"], group: "spend" },
    ],
    lead: "diet", floor: ["diet"],
    targets: { calTarget: 1900, proteinTarget: 90, bedTarget: "22:30", wakeTarget: "06:15", weekPts: 60 },
    foods: [{ name: "Greek yogurt & berries", cal: 220, pro: 18 }, { name: "Turkey sandwich", cal: 480, pro: 32 }, { name: "Protein shake", cal: 160, pro: 25 }],
    meds: [
      { id: "m-lis", name: "Lisinopril", kind: "rx", dose: "10", unit: "mg", times: ["07:30"], notes: "With water, before coffee.", counts: 0, active: true },
      { id: "m-vitd", name: "Vitamin D", kind: "otc", dose: "2000", unit: "IU", times: ["07:30"], notes: "", counts: 0, active: true },
    ],
    layout: { preset: "simple", names: { work: "House" }, icons: { work: "building" }, hidePages: ["routines", "progress"], hideTabs: [], hideSections: [] },
  };
  const notes = [
    "4B's garbage disposal is possessed. Pepper and I walked it off.", "Ate a real lunch sitting down. Revolutionary.",
    "Tenant in Belmont #2 finally paid. Slept like a rock.", "Too much coffee, not enough protein. Tomorrow.",
    "Plumber didn't show. I did. Counts for something.", "", "Pepper found a tennis ball at Laurelhurst. Best part of the day.",
    "Spent 40 minutes on hold with the water bureau. Salad for dinner as a treat.", "Winter prep list is scary. Wrote it down anyway.",
    "Smoke detectors in Alder done. Three dead batteries. Nobody died.", "", "Took the evening off. Soup and a documentary.",
    "Showing at 4B went well, I think. Couple with a cat.",
  ];
  dateRange(since, at(-1)).forEach((d, j) => {
    if (j === 5) return; // one missed day
    const good = j % 4 !== 1;
    db.docs[`users/${uid}/days/${d}`] = { date: d, logged: true, updated: 0, a: {
      calories: good ? 1850 + (j % 3) * 60 : 2350, protein: good ? 85 + (j % 4) * 5 : 55, fruitVeg: good, sugar: good ? 0 : 1, processed: j % 5 === 0 ? 1 : 0,
      bed: good ? "22:40" : "23:50", wake: "06:20", c: { pepper: [true, j % 3 !== 0] }, reflection: notes[j % notes.length], doneAt: Date.now() - (14 - j) * 86_400_000,
    } };
    db.docs[`scores/${uid}_${d}`] = { uid, date: d, total: good ? 10 + (j % 3) : 6, logged: true, showed: true, streak: true, updated: 0 };
    db.docs[`users/${uid}/medlog/${d}`] = { date: d, items: [
      { id: `l${j}a`, medId: "m-lis", name: "Lisinopril", dose: "10", unit: "mg", at: new Date(`${d}T07:${35 + (j % 20)}:00`).getTime() },
      ...(j % 3 ? [{ id: `l${j}b`, medId: "m-vitd", name: "Vitamin D", dose: "2000", unit: "IU", at: new Date(`${d}T07:40:00`).getTime() }] : []),
    ] };
  });
  db.docs[`users/${uid}/medlog/${today}`] = { date: today, items: [{ id: "lt", medId: "m-lis", name: "Lisinopril", dose: "10", unit: "mg", at: new Date(`${today}T07:42:00`).getTime() }] };
  db.docs[`users/${uid}/days/${today}`] = { date: today, logged: true, updated: 0, a: {
    meals: [
      { id: "p1", name: "Greek yogurt & berries", cal: 220, pro: 18, hunger: 3, at: new Date(`${today}T07:15:00`).getTime() },
      { id: "p2", name: "Turkey sandwich", cal: 480, pro: 32, hunger: 4, at: new Date(`${today}T12:40:00`).getTime() },
      { id: "p3", name: "Handful of almonds", cal: 170, pro: 6, at: new Date(`${today}T15:30:00`).getTime() },
    ],
    calories: 870, protein: 56, fv: 2, fruitVeg: false, water: 4, bed: "22:35", wake: "06:10", c: { pepper: [true] } } };

  const T = (id, goal, ms, name, due, hours, extra = {}) => ({ id, goal, ms, name, due, hours, done: "", created: id, ...extra });
  db.docs[`users/${uid}/lists/work`] = {
    perDay: 4,
    goals: [
      { id: "g4b", name: "Unit 4B turnover", due: at(16), icon: "key" },
      { id: "gwin", name: "Winter prep", due: at(40), icon: "leaf" },
      { id: "gsmoke", name: "Smoke-detector checks", due: at(45), icon: "heart" },
    ],
    milestones: [
      { id: "r", goal: "g4b", name: "Repairs", due: at(5), icon: "hammer" },
      { id: "c", goal: "g4b", name: "Cleaning", due: at(9), icon: "sparkles" },
      { id: "l", goal: "g4b", name: "Listing", due: at(12), icon: "camera" },
      { id: "t", goal: "g4b", name: "Tenant calls", due: at(15), icon: "phone" },
      { id: "wg", goal: "gwin", name: "Gutters", due: at(20), icon: "house" },
      { id: "wh", goal: "gwin", name: "Heating", due: at(30), icon: "heart" },
      { id: "sa", goal: "gsmoke", name: "Alder St", due: at(-2), icon: "building" },
      { id: "sb", goal: "gsmoke", name: "Belmont", due: at(20), icon: "building" },
      { id: "sc", goal: "gsmoke", name: "Clinton", due: at(40), icon: "building" },
    ],
    tasks: [
      T("a1", "g4b", "r", "Plumber: garbage disposal", at(0), 1, { at: "10:00" }),
      T("a2", "g4b", "r", "Patch hallway drywall", at(2), 2, { spent: 35 }),
      T("a3", "g4b", "r", "Replace bathroom fan", at(1), 1.5),
      T("a4", "g4b", "c", "Book deep clean", at(3), 0.25, { after: "a2" }),
      T("a5", "g4b", "l", "Photos (after cleaning)", at(10), 1, { after: "a4" }),
      T("a6", "g4b", "l", "Write listing", at(11), 1),
      T("a7", "g4b", "t", "Call back the couple with the cat", at(0), 0.25, { at: "16:30" }),
      T("b1", "gwin", "wg", "Get 3 gutter quotes", at(7), 1),
      T("b2", "gwin", "wh", "Furnace service: Belmont", at(14), 0.5),
      T("b3", "gwin", "wg", "Clear Clinton downspout", at(-12), 0.5),
      T("a8", "g4b", "t", "Return deposit to old tenant", at(-9), 0.5, { pushes: 1 }),
      T("s1", "gsmoke", "sa", "Alder St: all 6 units", at(-3), 3, { done: at(-3), spent: 190 }),
      T("s2", "gsmoke", "sb", "Belmont: all 5 units", at(18), 2.5),
      T("s3", "gsmoke", "sc", "Clinton: all 3 units", at(38), 1.5),
    ],
  };
  return { name: "Rosa" };
}

// ---------- A brand-new person (preview-new-*.html): signed in, nothing set up yet ----------
export function seedNew() {
  return { name: "Sam" };
}
