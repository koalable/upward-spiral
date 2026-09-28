// Progress: streak calendars and badges, plus my spiral and week-over-week numbers.
import { state } from "../state.js";
import { streaksView, shiftMonth } from "../views/streaks.js";
import { progressView } from "../views/progress.js";

export default {
  tabs: [["streaks", "Streaks & badges", streaksView], ["me", "My progress", progressView]],
  actions: {
    area: (el) => { state.area = el.dataset.area; },
    calMonth: (el) => shiftMonth(Number(el.dataset.by)),
  },
};
