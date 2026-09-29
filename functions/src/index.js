// Server side of notifications. Every minute: Work task timers that just ran out (read from lists/work).
// Every 15 minutes: for each person who turned notifications on, work out what's due in their own
// time zone (src/notify.js) and push it to their devices.
// Built into functions/index.js by build.mjs; deployed by .github/workflows/deploy-app.yml.
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { dueNotifications, localNow, markSent, normalizeNotify, timerMessage } from "../../src/notify.js";

initializeApp();
const db = getFirestore();
const BASE = "https://app.kstarr.com";
const LINKS = { checkin: `${BASE}/`, routines: `${BASE}/routines`, work: `${BASE}/work`, progress: `${BASE}/progress` };
const GONE = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

// Sends each message to every device; returns the tokens that still work.
async function push(tokens, messages) {
  const dead = new Set();
  for (const m of messages) {
    const live = tokens.filter((t) => !dead.has(t));
    if (!live.length) break;
    const res = await getMessaging().sendEachForMulticast({
      tokens: live,
      webpush: {
        notification: { title: m.title, body: m.body, icon: `${BASE}/icon-192.png`, badge: `${BASE}/icon-192.png`, tag: m.id },
        fcmOptions: { link: m.link || LINKS.checkin },
      },
      data: { link: m.link || LINKS.checkin },
    });
    res.responses.forEach((r, i) => { if (!r.success && GONE.has(r.error?.code)) dead.add(live[i]); });
  }
  return tokens.filter((t) => !dead.has(t));
}

const prevDate = (date) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

async function userData(uid, date) {
  const u = db.collection("users").doc(uid);
  const refs = [u, u.collection("days").doc(date), u.collection("lists").doc("routines"),
    u.collection("routinelog").doc(date), u.collection("lists").doc("work"), u.collection("medlog").doc(date),
    u.collection("medlog").doc(prevDate(date))];
  const [settings, day, routines, routinelog, work, medlog, medlogPrev] = (await db.getAll(...refs)).map((s) => (s.exists ? s.data() : null));
  return { settings, day, routines, routinelog, work, medlog, medlogPrev };
}

export const notifyTick = onSchedule({ schedule: "every 1 minutes", timeZone: "UTC", region: "us-central1", memory: "256MiB" }, async () => {
  const snap = await db.collectionGroup("notify").get();
  const settingsOf = new Map(snap.docs.filter((d) => d.id === "settings").map((d) => [d.ref.parent.parent.id, d.data()]));

  // Timers, every run: the running timer lives in each person's Work doc (lists/work → timer).
  for (const [uid, prefs] of settingsOf) {
    const tokens = (prefs.tokens || []).map((x) => x.t).filter(Boolean);
    if (!tokens.length) continue;
    try {
      const ref = db.doc(`users/${uid}/lists/work`), work = (await ref.get()).data();
      const tm = work?.timer, name = (work?.tasks || []).find((t) => t.id === tm?.id)?.name || "";
      const msg = timerMessage(tm && { ...tm, name }, Date.now(), LINKS);
      if (!msg) continue;
      await push(tokens, [msg]);
      await ref.update({ "timer.sent": tm.end });
    } catch (err) {
      console.error(`timer ${uid}`, err);
    }
  }

  // Everything else: every 15 minutes.
  if (new Date().getUTCMinutes() % 15) return;
  for (const doc of snap.docs) {
    if (doc.id !== "settings") continue;
    const uid = doc.ref.parent.parent.id;
    const prefs = doc.data();
    const tokens = (prefs.tokens || []).map((x) => x.t).filter(Boolean);
    if (!tokens.length) continue;
    try {
      const now = localNow(Date.now(), prefs.tz);
      const messages = dueNotifications(prefs, await userData(uid, now.date), now, LINKS);
      if (!messages.length) continue;
      const keep = await push(tokens, messages);
      await doc.ref.update({
        sent: markSent(prefs, now.date, messages.map((m) => m.id)),
        tokens: (prefs.tokens || []).filter((x) => keep.includes(x.t)),
      });
    } catch (err) {
      console.error(`notify ${uid}`, err);
    }
  }
});

// "Send a test" button in the app.
export const sendTest = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Sign in first.");
  // A linked account (aliases/{email}) acts as its main account.
  const email = String(req.auth.token.email || "").toLowerCase();
  const alias = email ? await db.doc(`aliases/${email}`).get() : null;
  const uid = alias?.exists ? alias.data().uid : req.auth.uid;
  const ref = db.doc(`users/${uid}/notify/settings`);
  const prefs = normalizeNotify((await ref.get()).data());
  const tokens = prefs.tokens.map((x) => x.t).filter(Boolean);
  if (!tokens.length) throw new HttpsError("failed-precondition", "Turn on notifications on this device first.");
  const keep = await push(tokens, [{ id: "test", title: "Notifications are on", body: "This is what a reminder looks like.", link: LINKS.checkin }]);
  if (keep.length !== tokens.length) await ref.update({ tokens: prefs.tokens.filter((x) => keep.includes(x.t)) });
  return { devices: keep.length };
});
