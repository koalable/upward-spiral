// Check-in → Notifications: turn them on for this phone, and choose what gets sent and when.
import { html } from "../util.js";
import { state, leadName } from "../state.js";
import { normalizeNotify } from "../notify.js";
import { pushReady, isInstalled, permission, onHere } from "../pushsetup.js";
import { icon } from "./components.js";

const APP_URL = "https://app.kstarr.com";

function deviceCard() {
  const status = state.pushStatus;
  if (!pushReady() || !isInstalled()) {
    return html`<section class="panel"><h2>This device</h2>
      <p>Notifications come through the Spiral app on your home screen.</p>
      <ol class="steps"><li>On your iPhone, open <b>${APP_URL.replace("https://", "")}</b> in Safari.</li>
        <li>Tap Share ${icon("share")} then <b>Add to Home Screen</b>.</li>
        <li>Open Spiral from your home screen, sign in, and come back to this tab.</li></ol>
      <p class="hint">Your choices below still save from here and apply to every device you turn on.</p></section>`;
  }
  if (permission() === "denied") {
    return html`<section class="panel"><h2>This device</h2>
      <p>Notifications are blocked for Spiral. Turn them on in iPhone <b>Settings → Notifications → Spiral</b>, then come back here.</p></section>`;
  }
  if (onHere()) {
    return html`<section class="panel"><h2>This device</h2>
      <p class="onrow">${icon("bell-ring")} <b>On for this device.</b></p>
      <div class="row"><button class="btn" data-act="pushTest" ${status === "sending" ? "disabled" : ""}>${status === "sending" ? "Sending…" : "Send a test"}</button>
        <button class="btn ghost" data-act="pushOff">Turn off on this device</button></div>
      ${status === "sent" ? html`<p class="hint">Sent. It should arrive in a few seconds.</p>` : ""}
      ${status && status.startsWith?.("err:") ? html`<p class="hint bad">${status.slice(4)}</p>` : ""}</section>`;
  }
  return html`<section class="panel"><h2>This device</h2>
    <p>Get reminders on this device, even when the app is closed.</p>
    <button class="btn" data-act="pushOn" ${status === "asking" ? "disabled" : ""}>${icon("bell")} ${status === "asking" ? "Waiting for your OK…" : "Turn on notifications"}</button>
    ${status === "error" ? html`<p class="hint bad">That didn't work. Close the app fully and try again.</p>` : ""}</section>`;
}

const toggle = (path, on) => html`<label class="switch"><input type="checkbox" data-notify="${path}" ${on ? "checked" : ""}><span></span></label>`;
const time = (path, value) => html`<input class="field time" type="time" data-notify="${path}" value="${value || ""}">`;

function choice(key, ico, title, about, p, withTime = true) {
  return html`<div class="nrow">
    <span class="tchip nico">${icon(ico)}</span>
    <div class="max"><b>${title}</b><div class="small muted">${about}</div>
      ${withTime && p[key].on ? html`<div class="ntime"><span class="small muted">at</span>${time(`${key}.time`, p[key].time)}</div>` : ""}</div>
    ${toggle(`${key}.on`, p[key].on)}</div>`;
}

export function notifyView() {
  const p = normalizeNotify(state.notify);
  const devices = p.tokens.length;
  return html`${deviceCard()}
    <section class="panel"><h2>What to send me</h2>
      <div class="nlist">
        ${choice("checkin", "notebook-pen", "Check-in reminder", "Skipped once today's check-in is finished.", p)}
        ${choice("rituals", "list-checks", "Ritual start", "At each ritual's time (set under Habits), if it isn't done.", p, false)}
        ${choice("meds", "pill", "Meds", "At each medication's scheduled times, unless that dose is logged.", p, false)}
        ${choice("work", "briefcase", "Work", "A morning list of today's tasks.", p)}
        ${choice("streak", "flame", "Streak saver", `Only if ${leadName().toLowerCase()} isn't logged yet.`, p)}
      </div></section>
    <section class="panel"><h2>Quiet hours</h2>
      <div class="nrow"><span class="tchip nico">${icon("moon")}</span><div class="max"><b>Nothing between</b>
        ${p.quiet.on ? html`<div class="ntime">${time("quiet.from", p.quiet.from)}<span class="small muted">and</span>${time("quiet.to", p.quiet.to)}</div>` : html`<div class="small muted">Off</div>`}</div>
        ${toggle("quiet.on", p.quiet.on)}</div></section>
    <p class="privacy small muted">🔒 Reminders only say what's due, never your scores or answers. ${devices ? `On for ${devices} device${devices === 1 ? "" : "s"}.` : "Not on for any device yet."}</p>`;
}
