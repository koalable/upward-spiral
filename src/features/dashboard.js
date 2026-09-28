// Check-in page dashboard: tick off today's to-dos and Work tasks without leaving the page.
import { todoHandlers } from "./todos.js";
import work from "./work.js";
import { dashboardView } from "../views/dashboard.js";

export default {
  ...todoHandlers,
  actions: { ...todoHandlers.actions, wToggle: work.actions.wToggle },
  // Today is a live tab (patched, not redrawn), so refresh the dashboard here when to-dos or Work change.
  patch(tab, view) {
    const box = tab === "today" && view.querySelector("#live-dash");
    if (box && !box.contains(document.activeElement)) box.innerHTML = String(dashboardView());
  },
};
