// Check-in page dashboard: tick off today's to-dos and Work tasks without leaving the page.
import { todoHandlers } from "./todos.js";
import work from "./work.js";

export default {
  ...todoHandlers,
  actions: { ...todoHandlers.actions, wToggle: work.actions.wToggle },
};
