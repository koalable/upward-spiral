// Check-in page dashboard: tick off today's to-dos and Work tasks without leaving the page.
import { todoHandlers } from "./todos.js";
import { dashboardView } from "../views/dashboard.js";
import { edit } from "../docs.js";
import { toggleDone } from "../work.js";
import { state } from "../state.js";

export default {
  ...todoHandlers,
  actions: { ...todoHandlers.actions, wToggle: (el) => { edit("work", (w) => toggleDone(w, el.dataset.id, state.date)); } },
  // Today is a live tab (patched, not redrawn), so refresh the dashboard here when to-dos or Work change.
  patch(tab, view) {
    const box = tab === "today" && view.querySelector("#live-dash");
    if (box && !box.contains(document.activeElement)) box.innerHTML = String(dashboardView());
  },
};
