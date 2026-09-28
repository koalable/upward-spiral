// Progress: the check-in streak and freezes, streak calendars and badges, plus my spiral and week-over-week numbers.
import { state, isEditable, myFreezes } from "../state.js";
import { answers, commitDay } from "../day.js";
import { streaksView, shiftMonth } from "../views/streaks.js";
import { progressView } from "../views/progress.js";

export default {
  tabs: [["streaks", "Streaks & badges", streaksView], ["me", "My progress", progressView]],
  actions: {
    area: (el) => { state.area = el.dataset.area; },
    calMonth: (el) => shiftMonth(Number(el.dataset.by)),
    // streak freezes (moved here from Check-in)
    freeze(el) {
      const d = el.dataset.date;
      if (!isEditable(d) || myFreezes() < 1) return "none";
      answers(d).freeze = true;
      commitDay(d);
    },
    unfreeze(el) {
      const d = el.dataset.date;
      if (!isEditable(d)) return "none";
      answers(d).freeze = false;
      commitDay(d);
    },
  },
};
