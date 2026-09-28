import { html } from "../util.js";
import { MAX_DAILY } from "../constants.js";
import { gameRules } from "./rules.js";

export const joinView = () => html`<section class="panel signin prose"><h2>Join the challenge</h2>
  <p>You choose your own questions. Each scored one is worth 4 points, and totals are scaled so everyone plays out of ${MAX_DAILY} a day.</p>
  <p>🔒 <b>Private to you:</b> your questions, answers, targets, goals, journal, medications, and weekly reset.
    <b>Seen by the group:</b> your display name, daily score, streak, freezes, check-ins, finish time, and any win you choose to share.</p>
  <p class="small muted">Private means other players can't see it in the app or the database. Whoever runs the Firebase project can still see raw data in the Firebase console.</p>
  <h3 class="rulehead">How the game works</h3><dl class="rules">${gameRules()}</dl>
  <p><button class="btn" data-act="join">Join the challenge</button></p></section>`;

export const signInView = () => html`<section class="panel signin"><h2>Sign in to the challenge</h2>
  <p>Use the Google account the organizer added to the group.</p>
  <p><button class="btn" data-act="signIn">Sign in with Google</button></p></section>`;
