// The group: seasons, leaderboard, check-ins, and the weekly reset with shared wins.
import { state, currentSeason } from "../state.js";
import { save, remove, paths } from "../store.js";
import { isSet, todayKey, weekStart } from "../util.js";
import { ui } from "../render.js";
import { groupView, shareRow } from "../views/group.js";

const $ = (sel) => ui.view.querySelector(sel);

export default {
  tabs: [["group", "Group", groupView]],
  actions: {
    board: (el) => { state.board = el.dataset.board; },
    startSeason() {
      const start = $("#wlc-season").value;
      if (!start) return "none";
      const current = currentSeason();
      state.season = { start, n: current ? current.n + 1 : 1, weeks: 6, breakDays: 3, uid: state.uid };
      save(paths.season(), state.season, 0);
    },
    moveSeason() {
      const start = $("#wlc-season").value;
      if (!start || !state.season) return "none";
      state.season = { ...state.season, start, uid: state.uid };
      save(paths.season(), state.season, 0);
    },
    shareWin() {
      const week = weekStart(todayKey()), text = state.weekly[week]?.win;
      if (!isSet(text)) return "none";
      const doc = { uid: state.uid, week, text: String(text).slice(0, 1000) };
      state.wins[`${state.uid}_${week}`] = doc;
      save(paths.win(state.uid, week), doc, 0);
    },
    unshareWin() {
      const week = weekStart(todayKey());
      delete state.wins[`${state.uid}_${week}`];
      remove(paths.win(state.uid, week));
    },
  },
  input(el) {
    const key = el.dataset.weekly;
    if (!key) return false;
    const week = weekStart(todayKey());
    const doc = { ...(state.weekly[week] || { week }), [key]: el.value };
    state.weekly[week] = doc;
    save(paths.weekly(state.uid, week), doc, 900);
    if (key === "win") {
      const row = $("#share-row");
      if (row) row.innerHTML = String(shareRow(el.value, state.wins[`${state.uid}_${week}`]));
    }
    return true;
  },
};
