// To-dos: add, tick off, date, and remove. One private list (users/{uid}/lists/todos).
import { state } from "../state.js";
import { save, paths } from "../store.js";
import { clone, newId, todayKey } from "../util.js";
import { ui, render } from "../render.js";
import { edit as docEdit } from "../docs.js";
import { todosView } from "../views/todos.js";

const $ = (sel) => ui.view.querySelector(sel);

const edit = (fn) => { docEdit("todos", (doc) => { fn(doc.items); }); };
const find = (items, id) => items.find((x) => x.id === id);

function addTodo(form) {
  const input = $(`#${form}-t`), text = input?.value.trim();
  if (!text) return input?.focus(), "none";
  const on = $(`#${form}-on`)?.value || "", due = $(`#${form}-due`)?.value || "";
  edit((items) => items.push({ id: newId("t"), t: text, on, due, done: "", created: todayKey() }));
  render();
  $(`#${form}-t`)?.focus();
  return "none";
}

// The handlers without the tab, so the Check-in dashboard can use them too.
export const todoHandlers = {
  actions: {
    todoAdd: (el) => addTodo(el.dataset.form),
    todoRemove: (el) => edit((items) => { const i = items.findIndex((x) => x.id === el.dataset.id); if (i >= 0) items.splice(i, 1); }),
    todoDates: (el) => { state.editTodo = el.dataset.id || null; },
  },
  change(el) {
    const d = el.dataset;
    if (d.todoDone) {
      edit((items) => { const x = find(items, d.todoDone); if (x) x.done = el.checked ? todayKey() : ""; });
      return render(), true;
    }
    if (d.todoOn || d.todoDue) {
      edit((items) => { const x = find(items, d.todoOn || d.todoDue); if (x) x[d.todoOn ? "on" : "due"] = el.value || ""; });
      return render(), true;
    }
    return false;
  },
  keydown(event) {
    const form = event.target.dataset.todoInput;
    if (event.key !== "Enter" || !form) return false;
    return addTodo(form), true;
  },
  busy: () => Boolean(state.editTodo),
};

export default { tabs: [["todos", "To-dos", todosView]], ...todoHandlers };
