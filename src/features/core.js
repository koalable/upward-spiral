// On every page: theme, text size, signing in and out, and joining.
import { state, settings, sheet, closeSheet } from "../state.js";
import { WELCOME_CATS } from "../views/join.js";
import { applyPreset } from "../layout.js";
import { setPath } from "../util.js";
import { render } from "../render.js";
import { saveMember } from "../day.js";
import { save, paths } from "../store.js";
import { todayKey, addDays } from "../util.js";
import { toggleTheme, stepTextSize, settingsOpen } from "../render.js";
import { hasPage, pageUrl } from "../page.js";
import { auth } from "../auth.js";

// data-draft="key" (or "times.1"): typing goes straight into the open draft. data-num: store a number ("" if blank).
// data-redraw: the form's shape depends on this field (e.g. a Type select), so draw it again.
function draftValue(el) {
  if (el.type === "checkbox") return el.checked;
  if ("num" in el.dataset) return el.value === "" ? "" : Number(el.value);
  return el.value;
}
const intoDraft = (el) => {
  if (!("draft" in el.dataset) || !state.sheet) return false;
  setPath(state.sheet, el.dataset.draft, draftValue(el));
  return true;
};

export default {
  input: intoDraft,
  change: (el) => (intoDraft(el) ? ("redraw" in el.dataset && render(), true) : false),
  actions: {
    theme: (el) => { toggleTheme(el?.dataset?.theme); },
    textSmaller: () => { stepTextSize(-1); },
    textLarger: () => { stepTextSize(1); },
    signIn: () => (auth.signIn(), "none"),
    signOut: () => (auth.signOut(), "none"),
    welcomePreset(el) { const d = sheet("welcome"); d.preset = el.dataset.preset; d.cats = [...WELCOME_CATS[d.preset]]; },
    welcomeCat(el) { const d = sheet("welcome"), id = el.dataset.id; d.cats = d.cats.includes(id) ? d.cats.filter((x) => x !== id) : [...d.cats, id]; },
    welcomeNext() { sheet("welcome").step++; window.scrollTo({ top: 0 }); },
    welcomeBack() { sheet("welcome").step--; window.scrollTo({ top: 0 }); },
    // Joining: what they picked in the welcome becomes their starting setup.
    join() {
      const d = sheet("welcome") || { preset: "full", cats: WELCOME_CATS.full, workName: "" };
      const s = settings();
      s.cats = d.cats.map((id) => ({ id, kind: "builtin", scored: true }));
      s.lead = ["writing", "movement", "reading", "sleep", "diet"].find((id) => d.cats.includes(id)) || d.cats[0] || null;
      s.floor = s.floor.filter((id) => d.cats.includes(id));
      s.layout = applyPreset({ names: d.workName?.trim() ? { work: d.workName.trim() } : {} }, d.preset);
      closeSheet();
      state.members[state.uid] = { uid: state.uid, name: state.userName || "Member", joined: todayKey(), freezes: 0 };
      saveMember(0);
      save(paths.settings(state.uid), s, 0);
      state.tab = "today";
    },    // A link to a Settings tab (e.g. "Notification settings" on Meds) opens Settings there.
    openTab: (el) => { state.tab = el.dataset.tab; window.scrollTo({ top: 0 }); },
    // Settings live on the Check-in page; from anywhere else the gear goes there.
    openSettings() {
      // Settings live with Check-in; a one-page bundle without it goes there.
      if (!hasPage("checkin")) { location.href = `${pageUrl("checkin")}#customize`; return "none"; }
      if (!settingsOpen()) state.beforeSettings = state.route;
      state.tab = "customize";
      window.scrollTo({ top: 0 });
    },
    closeSettings() {
      state.route = state.beforeSettings || { tab: "today" };
      state.beforeSettings = null;
    },
    shiftDay(el) { const d = addDays(state.date, Number(el.dataset.by)); if (d <= todayKey()) state.date = d; },
    goToday() { state.date = todayKey(); },
  },
};
