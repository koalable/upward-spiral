// Customize: each person can rename pages, hide pages, tabs and sections. Display only: hidden things keep
// their data and come back as they were. Stored in the settings doc as `layout`.
//   layout: { preset, names: {pageId: "House"}, icons: {pageId: "house"}, hidePages: [], hideTabs: [], hideSections: [] }

export const PAGE_ICON_CHOICES = [
  ["work", "Briefcase"], ["house", "House"], ["building", "Building"], ["hammer", "Hammer"], ["key", "Key"],
  ["notebook-pen", "Notebook"], ["graduation-cap", "School"], ["heart", "Heart"], ["sprout", "Sprout"], ["target", "Target"],
];

// Each page's usual icon (Customize can change Work's).
export const PAGE_ICONS = { checkin: "edit_note", routines: "checklist", progress: "insights", work: "work" };

// What can be hidden. Check-in itself can't (Settings lives there), and neither can its Today tab.
export const HIDEABLE_PAGES = [["routines", "Habits"], ["work", "Projects"], ["progress", "Progress"]];
export const HIDEABLE_TABS = {
  checkin: [["meds", "Meds"], ["reflect", "Reflect"]],
  routines: [["routines", "Rituals"], ["rsetup", "Set up habits & rituals"], ["todos", "To-dos"]],
  work: [["wtoday", "Today"], ["wgoals", "Projects"]],
  progress: [["streaks", "Streaks & badges"], ["me", "My progress"], ["group", "Group"]],
};
export const SECTIONS = [
  ["rings", "Today's rings"],
  ["plate", "On your plate (to-dos and tasks)"],
  ["medlog", "Quick meds log"],
  ["breathing", "Breathing room"],
];

export const PRESETS = {
  full: { hidePages: [], hideTabs: [], hideSections: [] },
  // Fewer moving parts: Check-in (Today, Meds, Reflect) and Work/House. Habits and Progress hidden.
  simple: { hidePages: ["routines", "progress"], hideTabs: [], hideSections: [] },
};

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export function normalizeLayout(l) {
  return {
    preset: l?.preset === "simple" ? "simple" : l?.preset === "custom" ? "custom" : "full",
    names: { ...(l?.names || {}) },
    icons: { ...(l?.icons || {}) },
    hidePages: list(l?.hidePages),
    hideTabs: list(l?.hideTabs),
    hideSections: list(l?.hideSections),
  };
}

// Applying a preset keeps names and icons; it only sets what's shown.
export const applyPreset = (l, name) => ({ ...normalizeLayout(l), ...structuredClone(PRESETS[name] || PRESETS.full), preset: name });

export const pageLabel = (l, id, fallback) => String(l?.names?.[id] || "").trim() || fallback;
export const pageIcon = (l, id, fallback) => l?.icons?.[id] || fallback;
export const pageHidden = (l, id) => id !== "checkin" && list(l?.hidePages).includes(id);
export const tabHidden = (l, id) => id !== "today" && list(l?.hideTabs).includes(id);
export const sectionHidden = (l, id) => list(l?.hideSections).includes(id);

// Turning one thing on or off makes the layout "custom" unless it now matches a preset.
export function toggleIn(l, key, id) {
  const out = normalizeLayout(l);
  out[key] = out[key].includes(id) ? out[key].filter((x) => x !== id) : [...out[key], id];
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const match = Object.entries(PRESETS).find(([, p]) => ["hidePages", "hideTabs", "hideSections"].every((k) => same(out[k], p[k])));
  out.preset = match ? match[0] : "custom";
  return out;
}
