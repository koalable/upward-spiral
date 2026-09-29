// Targets & rules: my display name, private targets, the check-in reminder, and how scoring works.
import { html } from "../util.js";
import { APP_NAME } from "../constants.js";
import { scoredQuestions, questionName, questionRule } from "../scoring.js";
import { state, settings, hasBuiltin } from "../state.js";
import { dailyReminderLink } from "../calendar.js";
import { rule, saveStatus } from "./components.js";
import { gameRules } from "./rules.js";

export const reminderOpts = (t) => ({ title: `Log the ${APP_NAME}`, time: t.reminder, details: `60-second check-in: ${location.href}` });
export const reminderLink = (t) => dailyReminderLink(reminderOpts(t));

// Other Google accounts that open this same data (e.g. a work address).
function linkedPanel() {
  if (state.preview) return "";
  if (state.linkedTo) return html`<section class="panel"><h2>Linked account</h2>
    <p>You're signed in as <b>${state.email}</b>, linked to your main account. Everything you log goes there.</p></section>`;
  const list = state.aliases ? Object.keys(state.aliases) : null;
  return html`<section class="panel"><h2>Linked accounts</h2>
    <p class="hint">Sign in with another Google account (say, a work address) and see all of this. Only emails on the challenge list can be linked.</p>
    ${list === null ? html`<p class="hint">Loading…</p>` : list.length
      ? html`<ul class="list">${list.map((e) => html`<li class="row"><span class="max">${e}</span><button class="linkbtn" data-act="unlinkAccount" data-email="${e}">Unlink</button></li>`)}</ul>`
      : html`<p class="hint">None yet.</p>`}
    <div class="row"><input class="field wide" type="email" id="link-email" placeholder="hello@example.com" aria-label="Email to link">
      <button class="btn ghost" data-act="linkAccount">Link</button></div>
    ${state.linkMsg ? html`<p class="hint">${state.linkMsg}</p>` : ""}
    <p class="hint small">Link it here first, then sign in with it. Signing in with it before linking starts a separate, empty account.</p></section>`;
}

export function targetsView() {
  const t = settings().targets, me = state.members[state.uid] || {};
  const field = (key, label, type = "number") => html`<label>${label}<input class="field" type="${type}" ${type === "number" ? html`min="0" inputmode="numeric"` : ""} data-target="${key}" value="${t[key]}"></label>`;
  const fields = [
    html`<label>Display name<input class="field" data-display value="${me.display || me.name || ""}"></label>`,
    field("weekPts", "Weekly points goal"),
    hasBuiltin("sleep") && [field("bedTarget", "Bedtime target", "time"), field("wakeTarget", "Wake time target", "time")],
    hasBuiltin("diet") && [field("calTarget", "Calorie target"), field("proteinTarget", "Protein goal (g)")],
    hasBuiltin("writing") && field("writeMin", "Writing minutes a day"),
    hasBuiltin("reading") && field("readMin", "Reading minutes a day"),
    hasBuiltin("practices") && field("customPractice", "My own practice", "text"),
    hasBuiltin("substances") && [field("substanceLimit", "Substance daily limit"), field("substanceRule", "Substances — what counts", "text")],
    field("reminder", "Daily reminder time", "time"),
  ];
  return html`
    <section class="panel"><h2>My targets</h2>
      <p class="hint">Private. Lower a target any time rather than dropping it. Past days keep the targets they were scored with.</p>
      <div class="targets">${fields}</div>
      <p class="spaced"><a class="btn ghost" id="reminder-link" href="${reminderLink(t)}" target="_blank" rel="noopener">Google Calendar reminder</a>
        <button class="btn ghost" data-act="icsReminder">Apple Calendar (iCal) reminder</button></p>
      ${saveStatus()}</section>
    ${linkedPanel()}
    <section class="panel prose"><h2>How scoring works</h2>
      <h3 class="rulehead">Your categories</h3><dl class="rules">${scoredQuestions(settings()).map((q) => rule(questionName(q), "up to 4", questionRule(q)))}</dl>
      <h3 class="rulehead">How the game works</h3><dl class="rules">${gameRules()}</dl></section>`;
}
