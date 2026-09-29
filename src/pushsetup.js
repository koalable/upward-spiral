// This device's side of notifications: permission, the push address (FCM token), and a test.
// Only works in the installed app (app.kstarr.com, added to the home screen), where Firebase Messaging is loaded.
import { state } from "./state.js";
import { read, edit } from "./docs.js";
import { normalizeNotify } from "./notify.js";
import { getPref, setPref } from "./prefs.js";

export const isInstalled = () => Boolean(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone);
export const pushReady = () => Boolean(window.WLC_CONFIG?.app && window.WLC_CONFIG?.vapidKey && typeof firebase !== "undefined" && firebase.messaging && "Notification" in window && "serviceWorker" in navigator);
export const permission = () => ("Notification" in window ? Notification.permission : "unsupported");
export const myToken = () => getPref("pushToken") || "";
export const onHere = () => Boolean(myToken() && permission() === "granted" && read("notify").tokens.some((x) => x.t === myToken()));

// Every change to notification choices also records this device's time zone (the server uses it).
export const editNotify = (fn, delay) => edit("notify", (doc) => { fn(doc); doc.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; }, delay);

const deviceName = () => (/iPhone/.test(navigator.userAgent) ? "iPhone" : /iPad/.test(navigator.userAgent) ? "iPad" : /Android/.test(navigator.userAgent) ? "Android" : "Computer");

// Must start from a tap. Resolves to a short status for the screen.
export async function turnOnHere() {
  if (!pushReady()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm;
  const reg = await navigator.serviceWorker.ready;
  const token = await firebase.messaging().getToken({ vapidKey: window.WLC_CONFIG.vapidKey, serviceWorkerRegistration: reg });
  if (!token) return "error";
  setPref("pushToken", token);
  editNotify((doc) => { doc.tokens = [...doc.tokens.filter((x) => x.t !== token), { t: token, ua: deviceName(), at: Date.now() }].slice(-5); }, 0);
  return "on";
}

export async function turnOffHere() {
  const token = myToken();
  editNotify((doc) => { doc.tokens = doc.tokens.filter((x) => x.t !== token); }, 0);
  setPref("pushToken", "");
  try { await firebase.messaging().deleteToken(); } catch { /* already gone */ }
}

export async function sendTest() {
  const fn = firebase.app().functions("us-central1").httpsCallable("sendTest");
  return (await fn()).data;
}
