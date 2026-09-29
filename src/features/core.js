// On every page: theme, text size, signing in and out, and joining.
import { state, settings } from "../state.js";
import { saveMember } from "../day.js";
import { save, paths } from "../store.js";
import { todayKey, addDays } from "../util.js";
import { toggleTheme, stepTextSize } from "../render.js";
import { page, pageUrl } from "../page.js";
import { auth } from "../auth.js";

export default {
  actions: {
    theme: () => { toggleTheme(); },
    textSmaller: () => { stepTextSize(-1); },
    textLarger: () => { stepTextSize(1); },
    signIn: () => (auth.signIn(), "none"),
    signOut: () => (auth.signOut(), "none"),
    join() {
      state.members[state.uid] = { uid: state.uid, name: state.userName || "Member", joined: todayKey(), freezes: 0 };
      saveMember(0);
      save(paths.settings(state.uid), settings(), 0);
    },
    openTab: (el) => { state.tab = el.dataset.tab; },
    // Settings live on the Check-in page; from anywhere else the gear goes there.
    openSettings() {
      if (page.id !== "checkin") { location.href = `${pageUrl("checkin")}#settings`; return "none"; }
      state.settingsMode = true; state.tab = "customize";
      window.scrollTo({ top: 0 });
    },
    closeSettings() {
      state.settingsMode = false; state.tab = "today";
      if (location.hash === "#settings") history.replaceState(null, "", location.pathname + location.search);
    },
    shiftDay(el) { const d = addDays(state.date, Number(el.dataset.by)); if (d <= todayKey()) state.date = d; },
    goToday() { state.date = todayKey(); },
  },
};
