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
  db.watchCollection(`users/${uid}/goals`, null, (docs) => { state.goals = keepUnsaved(`users/${uid}/goals/`, docs, state.goals); refreshAfterRemoteChange(); }, onError);
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
    fbAuth.signInWithPopup(provider).catch((err) => {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(err?.code)) return fbAuth.signInWithRedirect(provider);
      setBanner(`Sign-in didn't finish: ${err?.message || "unknown error"}`, "bad");
    });
  };
  auth.signOut = () => fbAuth.signOut().then(() => location.reload());
  fbAuth.onAuthStateChanged((user) => {
    if (!user) { showTabs(false); setWho(""); showScreen(signInView()); return; }
    Object.assign(state, { uid: user.uid, email: user.email, userName: user.displayName || user.email });
    setWho(html`${state.userName} <button class="linkbtn" data-act="signOut">Sign out</button>`);
    showTabs(true);
    subscribe();
  });
}

function startPreview(seed) {
  const db = memoryAdapter();
  seed?.(db);
  useStore(db, { preview: true, status: setStatus });
  Object.assign(state, { uid: "preview", userName: "You", preview: true });
  setBanner(seed ? "Preview mode. Nothing is saved or shared. Ada and Bea are pretend players so you can see the group view." : "Preview mode. Nothing is saved or shared.");
  setWho("Preview");
  showTabs(true);
  subscribe();
}

export function start({ page: id, features, order, seed }) {
  const root = document.getElementById("wlc");
  if (!root) return;
  definePage(id, [core, ...features], order);
  state.tab = page.tabs[0][0];
  mountShell(root);
  bindEvents(root);
  const config = window.WLC_CONFIG?.firebase;
  if (config?.apiKey && typeof firebase !== "undefined") startFirebase(config);
  else startPreview(seed);
  startClock();
}
