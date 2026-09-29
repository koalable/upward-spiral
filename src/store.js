// Storage: one small interface over Firestore (live) or memory (preview),
// plus a debounced saver that reports status and remembers unsaved writes.
import { clone } from "./util.js";
import { SAVE_DELAY_MS } from "./constants.js";

export const paths = {
  settings: (uid) => `users/${uid}`,
  day: (uid, d) => `users/${uid}/days/${d}`,
  medlog: (uid, d) => `users/${uid}/medlog/${d}`,
  goals: (uid, key) => `users/${uid}/goals/${key}`,
  weekly: (uid, week) => `users/${uid}/weekly/${week}`,
  routines: (uid) => `users/${uid}/lists/routines`,
  routineLog: (uid, d) => `users/${uid}/routinelog/${d}`,
  work: (uid) => `users/${uid}/lists/work`,
  todos: (uid) => `users/${uid}/lists/todos`,
  notify: (uid) => `users/${uid}/notify/settings`,
  timer: (uid) => `users/${uid}/notify/timer`,
  alias: (email) => `aliases/${email.toLowerCase()}`,
  member: (uid) => `members/${uid}`,
  score: (uid, d) => `scores/${uid}_${d}`,
  win: (uid, week) => `wins/${uid}_${week}`,
  season: () => "config/season",
};

const snapshotToObject = (snap) => {
  const out = {};
  snap.forEach((doc) => { out[doc.id] = doc.data(); });
  return out;
};

export function firestoreAdapter(db) {
  const query = (path, where) => (where ? db.collection(path).where(...where) : db.collection(path));
  return {
    watchCollection: (path, where, onData, onError) => query(path, where).onSnapshot((s) => onData(snapshotToObject(s)), onError),
    watchDoc: (path, onData, onError) => db.doc(path).onSnapshot((d) => onData(d.exists ? d.data() : null), onError),
    set: (path, data) => db.doc(path).set(clone(data)),
    remove: (path) => db.doc(path).delete(),
    find: (path, where) => query(path, where).get().then(snapshotToObject),
  };
}

export function memoryAdapter() {
  const docs = {};
  const listeners = [];
  const notify = () => setTimeout(() => listeners.forEach((fn) => fn()), 0);
  const matches = (doc, where) => {
    if (!where) return true;
    const [field, op, value] = where;
    return op === "==" ? doc[field] === value : op === ">=" ? doc[field] >= value : true;
  };
  const collect = (path, where) => {
    const prefix = path + "/", out = {};
    for (const [key, doc] of Object.entries(docs)) {
      const id = key.slice(prefix.length);
      if (key.startsWith(prefix) && !id.includes("/") && matches(doc, where)) out[id] = clone(doc);
    }
    return out;
  };
  const listen = (fn) => { listeners.push(fn); setTimeout(fn, 0); };
  return {
    docs,
    watchCollection: (path, where, onData) => listen(() => onData(collect(path, where))),
    watchDoc: (path, onData) => listen(() => onData(docs[path] ? clone(docs[path]) : null)),
    set: (path, data) => { docs[path] = clone(data); notify(); return Promise.resolve(); },
    remove: (path) => { delete docs[path]; notify(); return Promise.resolve(); },
    find: (path, where) => Promise.resolve(collect(path, where)),
  };
}

// ---------- debounced saving ----------
const timers = {};
const queues = {};
let adapter = null;
let onStatus = () => {};
let previewMode = false;

export function useStore(a, { preview = false, status } = {}) {
  adapter = a;
  previewMode = preview;
  if (status) onStatus = status;
}
export const store = () => adapter;

const FAILED = {
  "permission-denied": "This account can't save here. Ask the organizer to add you.",
  default: "Couldn't save. Check your connection and try again.",
};

// Saves after a short pause; a newer save to the same path replaces a pending one.
export function save(path, data, delay = SAVE_DELAY_MS) {
  clearTimeout(timers[path]);
  onStatus("Saving…");
  const copy = clone(data);
  timers[path] = setTimeout(() => {
    delete timers[path];
    queues[path] = (queues[path] || Promise.resolve()).then(() =>
      adapter.set(path, copy).then(
        () => onStatus(previewMode ? "Preview only, not saved" : "Saved"),
        (err) => onStatus(FAILED[err?.code] || FAILED.default),
      ));
  }, delay);
}

export function remove(path) {
  clearTimeout(timers[path]);
  delete timers[path];
  return adapter.remove(path).catch(() => {});
}

export const isPending = (path) => path in timers;

// When a snapshot arrives, keep our own copies of anything we haven't finished saving.
export function keepUnsaved(prefix, incoming, local) {
  for (const path of Object.keys(timers)) {
    if (!path.startsWith(prefix)) continue;
    const key = path.slice(prefix.length);
    if (local[key]) incoming[key] = local[key];
  }
  return incoming;
}
