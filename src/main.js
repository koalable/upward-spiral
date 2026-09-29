// Startup: sign in, subscribe to data, and keep the clock-driven bits fresh.
import { state, settings } from "./state.js";
import { firestoreAdapter, memoryAdapter, useStore, store, keepUnsaved, isPending, save, paths } from "./store.js";
import { definePage, page, everyFeature } from "./page.js";
import core from "./features/core.js";
import { auth } from "./auth.js";
import { addDays, todayKey, weekStart, html } from "./util.js";
import { HISTORY_DAYS, MEDLOG_DAYS } from "./constants.js";
import { mountShell, render, patch, refreshAfterRemoteChange, setBanner, setWho, setStatus, showTabs, showScreen } from "./render.js";
import { signInView } from "./views/join.js";
import { fromGoals } from "./todos.js";
import { bindEvents } from "./events.js";

function subscribe() {
  const db = store(), uid = state.uid;
  const needed = new Set(["members", "scores", "season", "settings", "days"]);
  const arrived = (name) => {
    needed.delete(name);
    if (!needed.size && !state.loaded) { state.loaded = true; everyFeature("data", "loaded"); render(); }
    else { everyFeature("data", name); refreshAfterRemoteChange(); }
  };
  const onError = (err) => setBanner(err?.code === "permission-denied"
    ? `This Google account (${state.email}) isn't on the challenge list. Ask the organizer to add it, then reload.`
    : "Lost connection to the group data. Reload the page to reconnect.", "bad");

  db.watchCollection("members", null, (docs) => {
    const mine = state.members[uid];
    state.members = keepUnsaved("members/", docs, { [uid]: mine });
    arrived("members");
  }, onError);
  db.watchCollection("scores", ["date", ">=", state.historyStart], (docs) => { state.scores = keepUnsaved("scores/", docs, state.scores); arrived("scores"); }, onError);
  db.watchDoc(paths.season(), (doc) => { state.season = doc; arrived("season"); }, onError);
  db.watchDoc(paths.settings(uid), (doc) => {
    if (doc && !isPending(paths.settings(uid))) state.settings = doc;
    else if (!doc) save(paths.settings(uid), settings(), 0); // first visit: start from the defaults
    arrived("settings");
  }, onError);
  db.watchCollection(`users/${uid}/days`, ["date", ">=", state.historyStart], (docs) => {
    state.days = keepUnsaved(`users/${uid}/days/`, docs, state.days);
    arrived("days");
  }, onError);
  // To-dos: one list (lists/todos). The first time, carry over the old day/week/month lists (goals/*).
  let goalsIn = false, todosIn = false;
  const migrateTodos = () => {
    if (!goalsIn || !todosIn || state.todos) return;
    state.todos = fromGoals(state.goals);
    save(paths.todos(uid), state.todos, 0);
  };
  db.watchCollection(`users/${uid}/goals`, null, (docs) => {
    state.goals = keepUnsaved(`users/${uid}/goals/`, docs, state.goals);
    goalsIn = true; migrateTodos(); refreshAfterRemoteChange();
  }, onError);
  db.watchDoc(paths.todos(uid), (doc) => {
    if (!isPending(paths.todos(uid))) state.todos = doc;
    todosIn = true; migrateTodos(); refreshAfterRemoteChange();
  }, onError);
  db.watchCollection(`users/${uid}/weekly`, null, (docs) => { state.weekly = keepUnsaved(`users/${uid}/weekly/`, docs, state.weekly); refreshAfterRemoteChange(); }, onError);
  db.watchCollection(`users/${uid}/medlog`, ["date", ">=", addDays(todayKey(), -MEDLOG_DAYS)], (docs) => {
    state.medlog = keepUnsaved(`users/${uid}/medlog/`, docs, state.medlog);
    everyFeature("data", "medlog");
    refreshAfterRemoteChange();
  }, onError);
  db.watchDoc(paths.routines(uid), (doc) => {
    if (!isPending(paths.routines(uid))) state.routines = doc;
    everyFeature("data", "routines");
    refreshAfterRemoteChange();
  }, onError);
  db.watchDoc(paths.work(uid), (doc) => {
    if (!isPending(paths.work(uid))) state.work = doc;
    refreshAfterRemoteChange();
  }, onError);
  db.watchDoc(paths.notify(uid), (doc) => {
    if (!isPending(paths.notify(uid))) state.notify = doc;
    refreshAfterRemoteChange();
  }, onError);
  db.watchCollection(`users/${uid}/routinelog`, ["date", ">=", state.historyStart], (docs) => {
    state.routinelog = keepUnsaved(`users/${uid}/routinelog/`, docs, state.routinelog);
    refreshAfterRemoteChange();
  }, onError);
  db.watchCollection("wins", ["week", ">=", addDays(weekStart(todayKey()), -7)], (docs) => { state.wins = docs; refreshAfterRemoteChange(); }, onError);
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
  state.tab = page.tabs[0][0];
  if (id === "checkin" && location.hash === "#settings") Object.assign(state, { settingsMode: true, tab: "customize" });
  mountShell(root);
  bindEvents(root);
  keepTabBarDown();
  const config = window.WLC_CONFIG?.firebase;
  if (config?.apiKey && typeof firebase !== "undefined") startFirebase(config);
  else startPreview(seed);
  startClock();
}
