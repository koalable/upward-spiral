// Pop-up alerts for medications. Browsers only deliver these while the page is open.
import { getPref, setPref } from "./prefs.js";
import { upcomingAlerts } from "./meds.js";
import { DAY_MS } from "./constants.js";

let timers = [];

export const alertsSupported = () => "Notification" in window;
export const alertsOn = () => alertsSupported() && getPref("notify") === "1" && Notification.permission === "granted";

export async function enableAlerts() {
  if (!alertsSupported()) return false;
  const permission = await Notification.requestPermission();
  setPref("notify", permission === "granted" ? "1" : "0");
  scheduleAlerts();
  return permission === "granted";
}

export function disableAlerts() {
  setPref("notify", "0");
  scheduleAlerts();
}

// Call whenever the med list or log changes, and once a day after midnight.
export function scheduleAlerts() {
  timers.forEach(clearTimeout);
  timers = [];
  if (!alertsOn()) return;
  const now = Date.now();
  for (const { at, title, body } of upcomingAlerts(now)) {
    if (at - now > DAY_MS) continue;
    timers.push(setTimeout(() => {
      try { new Notification(title, { body }); } catch { /* some browsers need a service worker */ }
    }, at - now));
  }
}
