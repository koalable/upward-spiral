// Which page this bundle is serving, and the features on it.
// A feature is a plain object; every key is optional:
//   tabs:    [[id, label, view]]
//   actions: { name(el, event) → undefined (redraw) | "patch" | "none" }
//   input(el, event) / change(el, event) / keydown(event) → true when handled
//   leave(tab, view)   before switching away from a tab (keep half-finished forms)
//   patch(tab, view)   update live numbers in place
//   busy()             true while a form is open, so remote changes don't redraw it
//   data(name)         a subscription delivered new data
//   tick()             every 30 seconds; midnight() when the date changes
export const PAGES = [
  ["checkin", "Check-in", "/challenge"],
  ["routines", "Habits", "/challenge-routines"],
  ["work", "Work", "/challenge-work"],
  ["progress", "Progress", "/challenge-progress"],
];

export const CHECKIN_TABS = ["today", "meds", "reflect", "customize", "setup", "targets", "notify", "account"];
// These show only in Settings (the gear), not as Check-in tabs.
export const SETTINGS_TABS = ["customize", "setup", "targets", "notify", "account"];

// The pages this bundle can show, and which one is on screen. The home-screen app has all four in one bundle,
// so moving between them doesn't reload anything; the old Webflow bundles have one page each.
export const page = { id: "checkin", features: [], tabs: [], pages: {} };

// pages: { pageId: [features] }; always: features on every page (core). order: tab ids in display order.
export function definePages(current, pages, always = [], order = []) {
  const rank = (tab) => (order.includes(tab[0]) ? order.indexOf(tab[0]) : order.length);
  page.features = [...new Set([...always, ...Object.values(pages).flat()])];
  page.pages = Object.fromEntries(Object.entries(pages).map(([id, fs]) => [id, fs.flatMap((f) => f.tabs || []).sort((a, b) => rank(a) - rank(b))]));
  setPage(current in pages ? current : Object.keys(pages)[0]);
}
export const setPage = (id) => { page.id = id; page.tabs = page.pages[id]; };
export const hasPage = (id) => id in page.pages;
export const pageOfTab = (tab) => Object.keys(page.pages).find((id) => page.pages[id].some(([t]) => t === tab));

export const pageUrl = (id) => window.WLC_CONFIG?.pages?.[id] || PAGES.find(([p]) => p === id)[2];

export const everyFeature = (hook, ...args) => page.features.forEach((f) => f[hook]?.(...args));
// Runs a hook on each feature until one reports it handled the event (or is busy).
export const anyFeature = (hook, ...args) => page.features.some((f) => Boolean(f[hook]?.(...args)));
export const findAction = (name) => page.features.find((f) => f.actions?.[name])?.actions[name];
