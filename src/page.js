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
  ["routines", "Routines", "/challenge-routines"],
  ["work", "Work", "/challenge-work"],
  ["progress", "Progress", "/challenge-progress"],
];

export const CHECKIN_TABS = ["today", "meds", "journal", "setup", "targets"];

export const page = { id: "checkin", features: [], tabs: [] };

// order (optional): tab ids in the order they should appear.
export function definePage(id, features, order = []) {
  page.id = id;
  page.features = features;
  const rank = (tab) => (order.includes(tab[0]) ? order.indexOf(tab[0]) : order.length);
  page.tabs = features.flatMap((f) => f.tabs || []).sort((a, b) => rank(a) - rank(b));
}

export const pageUrl = (id) => window.WLC_CONFIG?.pages?.[id] || PAGES.find(([p]) => p === id)[2];

export const everyFeature = (hook, ...args) => page.features.forEach((f) => f[hook]?.(...args));
// Runs a hook on each feature until one reports it handled the event (or is busy).
export const anyFeature = (hook, ...args) => page.features.some((f) => Boolean(f[hook]?.(...args)));
export const findAction = (name) => page.features.find((f) => f.actions?.[name])?.actions[name];
