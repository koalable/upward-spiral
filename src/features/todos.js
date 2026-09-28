// To-do lists for today, this week, and this month. Private.
import { state } from "../state.js";
import { save, paths } from "../store.js";
import { clone } from "../util.js";
import { ui, render } from "../render.js";
import { todosView } from "../views/todos.js";

const $ = (sel) => ui.view.querySelector(sel);

function editGoals(key, fn) {
  const goals = state.goals[key] ? clone(state.goals[key]) : { period: key, items: [] };
  fn(goals.items);
  state.goals[key] = goals;
  save(paths.goals(state.uid, key), goals, 0);
}

function addGoal(key) {
  const input = $(`[data-goal-input="${key}"]`), text = input?.value.trim();
  if (!text) return input?.focus(), "none";
  editGoals(key, (items) => items.push({ t: text, done: false }));
  render();
  $(`[data-goal-input="${key}"]`)?.focus();
  return "none";
}

// The handlers without the tab, so other pages (the Check-in dashboard) can show today's list.
export const todoHandlers = {
  actions: {
    goalAdd: (el) => addGoal(el.dataset.goal),
    goalRemove: (el) => editGoals(el.dataset.goal, (items) => items.splice(Number(el.dataset.index), 1)),
  },
  change(el) {
    const key = el.dataset.goalDone;
    if (!key) return false;
    editGoals(key, (items) => { items[Number(el.dataset.index)].done = el.checked; });
    return render(), true;
  },
  keydown(event) {
    const key = event.target.dataset.goalInput;
    if (event.key !== "Enter" || !key) return false;
    return addGoal(key), true;
  },
};

export default { tabs: [["todos", "To-dos", todosView]], ...todoHandlers };
