// My lists: one private document each, all read and saved the same way.
//   read(name)      the cleaned-up document (never undefined; missing fields filled in)
//   edit(name, fn)  fn gets a copy to change (or returns a replacement); it's cleaned up, kept, and saved after a pause
// The live copy is state[name], exactly as stored. Nothing worked out on the fly (e.g. which goals are paused)
// ever goes through edit(), so it can't end up saved.
import { state } from "./state.js";
import { save, paths } from "./store.js";
import { clone } from "./util.js";
import { normalizeWork } from "./work.js";
import { normalizeRoutines } from "./routines.js";
import { normalizeTodos } from "./todos.js";
import { normalizeNotify } from "./notify.js";

export const LISTS = {
  work: { path: paths.work, normalize: normalizeWork, delay: 400 },
  routines: { path: paths.routines, normalize: normalizeRoutines, delay: 400 },
  todos: { path: paths.todos, normalize: normalizeTodos, delay: 300 },
  notify: { path: paths.notify, normalize: normalizeNotify, delay: 500 },
};

export const read = (name) => LISTS[name].normalize(state[name]);

export function edit(name, fn, delay = LISTS[name].delay) {
  const draft = clone(read(name));
  const next = LISTS[name].normalize(fn(draft) ?? draft);
  state[name] = next;
  save(LISTS[name].path(state.uid), next, delay);
  return next;
}
