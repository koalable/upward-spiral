// Startup: sign in, subscribe to data, and keep the clock-driven bits fresh.
import { state, settings } from "./state.js";
import { firestoreAdapter, memoryAdapter, useStore, store, keepUnsaved, isPending, save, paths } from "./store.js";
import { definePage, page, everyFeature } from "./page.js";
import core from "./features/core.js";
import { auth } from "./auth.js";
import { addDays, todayKey, weekStart, html } from "./util.js";
import { HISTORY_DAYS, MEDLOG_DAYS } from "./constants.js";
import { parseRoute } from "./route.js";
import { mountShell, followAddress, render, patch, refreshAfterRemoteChange, setBanner, setWho, setStatus, showTabs, showScreen } from "./render.js";
import { signInView } from "./views/join.js";
import { fromGoals } from "./todos.js";
import { bindEvents } from "./events.js";

// What this app keeps in sync, as one table. Each entry lands in state[name]; "needed" ones must arrive before
// the first draw. Collections keep any copies we haven't finished saving (keepUnsaved); docs skip a snapshot
// while our own save of that doc is pending.
function subscribe() {
  const db = store(), uid = state.uid;
  const onError = (err) => setBanner(err?.code === "permission-denied"
    ? `This Google account (${state.email}) isn't on the challenge list. Ask the organizer to add it, then reload.`
    : "Lost connection to the group data. Reload the page to reconnect.", "bad");
  const needed = new Set(["members", "scores", "season", "settings", "days"]);
  const arrived = (name) => {
    everyFeature("data", name);
    needed.delete(name);
    if (!state.loaded && !needed.size) { state.loaded = true; everyFeature("data", "loaded"); render(); }
    else if (state.loaded) refreshAfterRemoteChange();
  };
  const historyFrom = ["date", ">=", state.historyStart];
  const COLLECTIONS = [
    ["members", "members", null],
    ["scores", "scores", historyFrom],
    ["days", `users/${uid}/days`, historyFrom],
    ["medlog", `users/${uid}/medlog`, ["date", ">=", addDays(todayKey(), -MEDLOG_DAYS)]],
    ["routinelog", `users/${uid}/routinelog`, historyFrom],
    ["weekly", `users/${uid}/weekly`, null],
    ["wins", "wins", ["week", ">=", addDays(weekStart(todayKey()), -7)]],
  ];
  const DOCS = [
    ["season", paths.season()], ["settings", paths.settings(uid)],
    ["work", paths.work(uid)], ["routines", paths.routines(uid)], ["todos", paths.todos(uid)], ["notify", paths.notify(uid)],
  ];
  for (const [name, path, where] of COLLECTIONS) {
    db.watchCollection(path, where, (docs) => { state[name] = keepUnsaved(`${path}/`, docs, state[name] || {}); arrived(name); }, onError);
  }
  for (const [name, path] of DOCS) {
    db.watchDoc(path, (doc) => {
      if (!isPending(path)) state[name] = doc;
      if (name === "settings" && !doc) save(path, settings(), 0); // first visit: start from the defaults
      if (name === "todos" && !doc) carryOverTodos(db, uid);
      arrived(name);
    }, onError);
  }
}

// To-dos used to be three lists under users/{uid}/goals. The first time there's no to-do list, read those once
// and carry them over; after that they're never loaded again.
let carried = false;
function carryOverTodos(db, uid) {
  if (carried) return;
  carried = true;
  db.find(`users/${uid}/goals`).then((goals) => {
    if (state.todos) return;
    state.todos = fromGoals(goals);
    save(paths.todos(uid), state.todos, 0);
    refreshAfterRemoteChange();
  }, () => {});
}

// Every 30 seconds: countdowns tick. At midnight: move to the new day and re-arm alerts.
function startClock() {
  let lastDay = todayKey();
  setInterval(() => {
    if (!state.loaded) return;
    const today = todayKey();
    if (today !== lastDay) {
      lastDay = today;
      state.historyStart = addDays(today, -HISTORY_DAYS);
      if (state.date < today && page.tabs[0][0] === state.tab) { state.date = today; render(); }
      everyFeature("midnight");
    }
    everyFeature("tick");
    patch();
  }, 30_000);
}

function startFirebase(config) {
  firebase.initializeApp(config);
  const fbAuth = firebase.auth();
  useStore(firestoreAdapter(firebase.firestore()), { status: setStatus });
  auth.signIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // In the home-screen app a pop-up has nowhere to go, so sign in by redirect (same site, see authDomain).
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) return fbAuth.signInWithRedirect(provider);
    fbAuth.signInWithPopup(provider).catch((err) => {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(err?.code)) return fbAuth.signInWithRedirect(provider);
      setBanner(`Sign-in didn't finish: ${err?.message || "unknown error"}`, "bad");
    });
  };
  fbAuth.getRedirectResult().catch((err) => setBanner(`Sign-in didn't finish: ${err?.message || "unknown error"}`, "bad"));
  auth.signOut = () => fbAuth.signOut().then(() => location.reload());
  fbAuth.onAuthStateChanged(async (user) => {
    if (!user) { showTabs(false); setWho(""); showScreen(signInView()); return; }
    Object.assign(state, { uid: user.uid, authUid: user.uid, email: user.email, userName: user.displayName || user.email, linkedTo: "" });
    // A linked account (e.g. a work address) acts as its main account: same data, same streaks.
    try {
      const alias = await firebase.firestore().doc(`aliases/${user.email.toLowerCase()}`).get();
      if (alias.exists && alias.data().uid) Object.assign(state, { uid: alias.data().uid, linkedTo: alias.data().uid });
    } catch { /* not linked, or rules not published yet */ }
    setWho(html`${state.userName}${state.linkedTo ? html` <span class="muted">(linked)</span>` : ""} <button class="linkbtn" data-act="signOut">Sign out</button>`);
    showTabs(true);
    subscribe();
  });
}

function startPreview(seed) {
  const db = memoryAdapter();
  const who = seed?.(db);
  useStore(db, { preview: true, status: setStatus });
  Object.assign(state, { uid: "preview", userName: who?.name || "You", preview: true });
  setBanner(who?.name ? `Preview as ${who.name}, a pretend beta tester. Nothing is saved.` : seed ? "Preview mode. Nothing is saved or shared. Ada and Bea are pretend players so you can see the group view." : "Preview mode. Nothing is saved or shared.");
  setWho(who?.name ? `Preview · ${who.name}` : "Preview");
  showTabs(true);
  subscribe();
}

// iPhone home-screen app: the keyboard drags the bottom tab bar up with it, and after it closes iOS can leave
// the page shifted so the bar floats above the bottom. Hide the bar while typing; nudge the page back after.
const TYPES = /^(text|search|email|url|tel|number|password|date|time|datetime-local|month|week)$/;
const typingIn = (el) => el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && TYPES.test(el.type)) || el.isContentEditable);
const settle = () => { window.scrollBy(0, 1); window.scrollBy(0, -1); };
function keepTabBarDown() {
  document.addEventListener("focusin", (e) => { if (typingIn(e.target)) document.body.classList.add("typing"); });
  document.addEventListener("focusout", () => setTimeout(() => {
    if (typingIn(document.activeElement)) return;
    document.body.classList.remove("typing");
    settle();
  }, 50));
  // Also after the keyboard's close animation, and whenever the visible area settles.
  window.visualViewport?.addEventListener("resize", () => {
    if (!document.body.classList.contains("typing") && window.visualViewport.offsetTop) settle();
  });
}

export function start({ page: id, features, order, seed }) {
  const root = document.getElementById("wlc");
  if (!root) return;
  definePage(id, [core, ...features], order);
  // Start where the address says (a tab on this page), or on the first tab.
  const r = parseRoute(location.hash);
  state.route = page.tabs.some(([t]) => t === r.tab) ? r : { tab: page.tabs[0][0] };
  followAddress();
  mountShell(root);
  bindEvents(root);
  keepTabBarDown();
  const config = window.WLC_CONFIG?.firebase;
  if (config?.apiKey && typeof firebase !== "undefined") startFirebase(config);
  else startPreview(seed);
  startClock();
}
