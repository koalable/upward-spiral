// First visit: sign in, then a three-step welcome instead of a page of rules. The rules stay in
// Settings → Targets & scoring for anyone who wants them.
import { html } from "../util.js";
import { BUILTIN_ORDER, BUILTINS } from "../constants.js";
import { state, sheet, openSheet } from "../state.js";
import { GROUPS, groupOf, iconOf } from "../energy.js";
import { icon, pressed } from "./components.js";

// Simple starts with the basics; Everything with every built-in category.
export const WELCOME_CATS = { simple: ["sleep", "diet"], full: BUILTIN_ORDER };

const welcome = () => sheet("welcome") || openSheet("welcome", { step: 1, preset: "simple", cats: [...WELCOME_CATS.simple], workName: "" });

function step1(d) {
  const opts = [["simple", "Keep it simple", "A daily check-in on a few basics, meds, and a to-do list for your projects."],
    ["full", "The whole thing", "Every category, habits and rituals, streaks and progress charts, and a group leaderboard."]];
  return html`<h2>Hi ${String(state.userName || "").split(" ")[0] || "there"}. What do you want this for?</h2>
    <p class="hint">You can change all of this later in Settings.</p>
    <div class="presets">${opts.map(([id, name, hint]) => html`<button class="preset${d.preset === id ? " on" : ""}" data-act="welcomePreset" data-preset="${id}" aria-pressed="${pressed(d.preset === id)}"><b>${name}</b><span class="small-text">${hint}</span></button>`)}</div>
    <label class="field"><span>Call your projects page (optional)</span><input data-draft="workName" maxlength="16" placeholder="Work" value="${d.workName || ""}"></label>
    <p class="hint small">E.g. House, Studio, School. It holds your goals, milestones and tasks.</p>`;
}

function step2(d) {
  return html`<h2>What do you want to track each day?</h2>
    <p class="hint">Each one is a quick question on your daily check-in. Pick a few; you can add your own later.</p>
    ${GROUPS.filter((g) => BUILTIN_ORDER.some((id) => groupOf({ id, kind: "builtin" }).id === g.id)).map((g) => html`<h3 class="cfghead">${g.name}</h3>
      ${BUILTIN_ORDER.filter((id) => groupOf({ id, kind: "builtin" }).id === g.id).map((id) => {
        const on = d.cats.includes(id);
        return html`<button class="brpick${on ? " on" : ""}" data-act="welcomeCat" data-id="${id}" aria-pressed="${pressed(on)}">
          <span class="brbox" aria-hidden="true">${on ? icon("check") : ""}</span>${icon(iconOf({ id, kind: "builtin" }))}<span class="max">${BUILTINS[id].name}</span></button>`;
      })}`)}
    <p class="hint small">Medications go on the Meds tab, not here.</p>`;
}

function step3() {
  return html`<h2>One thing about privacy</h2>
    <p>🔒 Your answers, notes, meds, habits and projects are <b>private to you</b>.</p>
    <p>The group sees only your name, your daily score and streak, and whether you checked in.</p>
    <p class="hint small">Whoever runs the app's database can technically see raw data.</p>`;
}

export function joinView() {
  const d = welcome();
  return html`<section class="panel signin welcome">
    <div class="wsteps" aria-label="Step ${d.step} of 3">${[1, 2, 3].map((n) => html`<i class="${n <= d.step ? "on" : ""}"></i>`)}</div>
    ${d.step === 1 ? step1(d) : d.step === 2 ? step2(d) : step3()}
    <nav class="wrap">${d.step < 3 ? html`<button class="btn" data-act="welcomeNext" ${d.step === 2 && !d.cats.length ? "disabled" : ""}>Next</button>`
      : html`<button class="btn" data-act="join">Start</button>`}
      ${d.step > 1 ? html`<button class="transparent" data-act="welcomeBack">Back</button>` : ""}</nav></section>`;
}

export const signInView = () => html`<section class="panel signin"><h2>Sign in</h2>
  <p>Use the Google account you were invited with.</p>
  <p><button class="btn" data-act="signIn">Sign in with Google</button></p></section>`;
