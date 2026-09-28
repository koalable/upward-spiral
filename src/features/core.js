// On every page: theme, text size, signing in and out, and joining.
import { state, settings } from "../state.js";
import { saveMember } from "../day.js";
import { save, paths } from "../store.js";
import { todayKey, addDays } from "../util.js";
import { toggleTheme, stepTextSize } from "../render.js";
import { auth } from "../auth.js";

export default {
  actions: {
    theme: () => (toggleTheme(), "none"),
    textSmaller: () => (stepTextSize(-1), "none"),
    textLarger: () => (stepTextSize(1), "none"),
    signIn: () => (auth.signIn(), "none"),
    signOut: () => (auth.signOut(), "none"),
    join() {
      state.members[state.uid] = { uid: state.uid, name: state.userName || "Member", joined: todayKey(), freezes: 0 };
      saveMember(0);
      save(paths.settings(state.uid), settings(), 0);
    },
    openTab: (el) => { state.tab = el.dataset.tab; },
    shiftDay(el) { const d = addDays(state.date, Number(el.dataset.by)); if (d <= todayKey()) state.date = d; },
    goToday() { state.date = todayKey(); },
  },
};
