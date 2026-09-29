// Breathing room: the banner on Today, and the sheet that sets one up.
import { html, shortDate, todayKey } from "../util.js";
import { state, settings } from "../state.js";
import { questionName, isScored } from "../scoring.js";
import { isLadder } from "../ladder.js";
import { normalizeRoutines } from "../routines.js";
import { normalizeWork } from "../work.js";
import { LEVELS, WHYS, pauseFor, restartFor, restartDate, isPaused, comingBack, tinyVersion, weekEnds, itemKey } from "../breathing.js";
import { icon, pressed } from "./components.js";

export const isPausedCat = (id, date) => isPaused(settings(), "cat", id, date);

// Everything that could take a break, grouped.
export function pausable() {
  const cats = settings().cats.filter((q) => isScored(q) || isLadder(q));
  const habits = normalizeRoutines(state.routines).items;
  const goals = normalizeWork(state.work).goals;
  return { cats, habits, goals };
}
const nameOf = (x, p) => (x.kind === "cat" ? questionName(p.cats.find((q) => q.id === x.id) || { kind: "custom", name: x.id })
  : x.kind === "habit" ? p.habits.find((h) => h.id === x.id)?.name : p.goals.find((g) => g.id === x.id)?.name) || "Something";
const whyLabel = (id) => WHYS.find(([k]) => k === id)?.[1] || "";

export function breathingBanner() {
  const s = settings(), today = todayKey(), b = pauseFor(s, today), back = restartFor(s, today), p = pausable();
  const names = (list) => list.map((x) => nameOf(x, p)).join(", ");
  if (b) {
    return html`<section class="panel breath on"><div class="bhead">${icon("leaf")}<div class="max"><b>Breathing room until ${shortDate(weekEnds(today))}</b>
        <div class="small-text">${b.items.length ? html`Paused: ${names(b.items)}. ` : ""}${b.tiny.length ? html`Smaller: ${names(b.tiny)}. ` : ""}${b.why ? `(${whyLabel(b.why)})` : ""}</div>
        <div class="small-text">Restarts ${longish(restartDate(today))}.</div></div></div>
      <nav class="wrap"><button class="border small" data-act="brOpen">${icon("edit")}<span>Change</span></button>
        <button class="transparent small" data-act="brEnd">End it early</button></nav></section>`;
  }
  if (back) {
    return html`<section class="panel breath restart"><div class="bhead">${icon("sprout")}<div class="max"><b>Restarting after a break</b>
      <div class="small-text">${names(back.items)}${back.tiny.length ? `, and ${names(back.tiny)} back to full size` : ""}. Welcome back.</div></div></div></section>`;
  }
  return html`<button class="breathbtn" data-act="brOpen">${icon("leaf")}<span class="max">Need some breathing room this week?</span>${icon("chevron_right")}</button>`;
}

const longish = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

// Paused categories disappear from the check-in; this says where they went.
export function pausedNote() {
  const b = pauseFor(settings(), state.date), p = pausable();
  const cats = (b?.items || []).filter((x) => x.kind === "cat");
  return cats.length ? html`<p class="pausednote">${icon("leaf")} Paused this week: ${cats.map((x) => nameOf(x, p)).join(", ")}. Not counted as missed.</p>` : "";
}

function pick(x, label, on, sub = "") {
  return html`<button class="brpick${on ? " on" : ""}" data-act="brItem" data-kind="${x.kind}" data-id="${x.id}" aria-pressed="${pressed(on)}">
    <span class="brbox" aria-hidden="true">${on ? icon("check") : ""}</span><span class="max">${label}${sub ? html`<span class="small-text">${sub}</span>` : ""}</span></button>`;
}

export function breathingSheet() {
  const d = state.breath;
  if (!d) return "";
  const p = pausable(), s = settings(), today = todayKey();
  const on = (kind, id) => d.items.some((x) => x.kind === kind && x.id === id);
  const tiny = (x) => d.tiny.some((y) => itemKey(y) === itemKey(x));
  const paused = d.items.filter((x) => !tiny(x));
  const back = comingBack(paused, { today, goalsById: Object.fromEntries(p.goals.map((g) => [g.id, g])), tasks: normalizeWork(state.work).tasks, moved: d.moved || [] });
  const group = (title, list, kind) => (list.length ? html`<h4 class="brgroup">${title}</h4>${list.map((x) => pick({ kind, id: x.id }, kind === "cat" ? questionName(x) : x.name, on(kind, x.id)))}` : "");
  return html`<div class="sheetbg" data-act="brCancel"></div>
  <section class="bsheet" role="dialog" aria-modal="true" aria-label="Breathing room">
    <div class="tgrip" aria-hidden="true"></div>
    <nav class="ttop"><span class="max tlabel">Breathing room · until ${shortDate(weekEnds(today))}</span><button class="circle transparent" data-act="brCancel" aria-label="Close">${icon("close")}</button></nav>
    <h2 class="brtitle">What would help this week?</h2>
    <p class="hint">Taking a week off something isn't failing at it. It all restarts next week, and you'll see which goals are still on track.</p>

    <div class="brstep"><div class="brnum">1</div><div class="max"><h3>How much room do you need?</h3>
      <div class="brlevels">${LEVELS.map(([id, name, hint]) => html`<button class="brlevel${d.level === id ? " on" : ""}" data-act="brLevel" data-level="${id}" aria-pressed="${pressed(d.level === id)}"><b>${name}</b><span class="small-text">${hint}</span></button>`)}</div></div></div>

    <div class="brstep"><div class="brnum">2</div><div class="max"><h3>What gets a break?</h3>
      ${group("Check-in", p.cats, "cat")}${group("Habits", p.habits, "habit")}${group("Goals", p.goals, "goal")}
      <p class="hint small">Meds are never paused.</p></div></div>

    <div class="brstep"><div class="brnum">3</div><div class="max"><h3>Why?</h3>
      <div class="brwhys">${WHYS.map(([id, label]) => html`<button class="chip ${d.why === id ? "fill" : "border"}" data-act="brWhy" data-why="${id}" aria-pressed="${pressed(d.why === id)}">${label}</button>`)}</div>
      <label class="field"><span>Anything to remember about this week? (optional)</span><input data-br-note maxlength="300" value="${d.note || ""}" placeholder="e.g. Portland → Tokyo, back Sunday"></label></div></div>

    ${d.items.length ? html`<div class="brstep"><div class="brnum">4</div><div class="max"><h3>Would a smaller version do?</h3>
      <p class="hint">Keeping a thread going is often easier than restarting. Tap any that could shrink instead of stopping.</p>
      ${d.items.map((x) => {
        const item = x.kind === "cat" ? p.cats.find((q) => q.id === x.id) : x.kind === "habit" ? p.habits.find((h) => h.id === x.id) : p.goals.find((g) => g.id === x.id);
        return html`<button class="brpick${tiny(x) ? " on" : ""}" data-act="brTiny" data-kind="${x.kind}" data-id="${x.id}" aria-pressed="${pressed(tiny(x))}">
          <span class="brbox" aria-hidden="true">${tiny(x) ? icon("check") : ""}</span><span class="max">${nameOf(x, p)}<span class="small-text">${tiny(x) ? "Smaller: " : "Could be "}${tinyVersion(x.kind, item || {})}</span></span></button>`;
      })}</div></div>

    <div class="brstep"><div class="brnum">5</div><div class="max"><h3>Coming back</h3>
      ${paused.length ? html`<ul class="brback">${back.map((x) => html`<li class="${x.status.replace(" ", "")}">
        <span class="bstat">${x.status === "late" ? "Late" : x.status === "on track" ? "On track" : "Restarting"}</span>
        <span class="max"><b>${nameOf(x, p)}</b> ${x.status === "restarting" ? html`restarts ${longish(restartDate(today))}.`
          : x.status === "late" ? html`${x.count} task${x.count === 1 ? "" : "s"} due this week.`
          : html`${x.moving ? "Moved to next week. " : ""}${x.deadline ? `Still on track for ${shortDate(x.deadline)}.` : "No deadline."}`}</span>
        ${x.kind === "goal" && (x.status === "late" || x.moving) ? html`<button class="chip ${x.moving ? "fill" : "border"} small" data-act="brMove" data-id="${x.id}" aria-pressed="${pressed(Boolean(x.moving))}">${x.moving ? "Moving" : "Move to next week"}</button>` : ""}</li>`)}</ul>`
        : html`<p class="hint">Everything you picked stays on in a smaller form.</p>`}
      <p class="hint small">Paused days show as paused, not missed, so streaks and momentum don't drop.</p></div></div>` : ""}

    <nav class="wrap bracts"><button data-act="brSave" ${d.items.length ? "" : "disabled"}>${icon("leaf")}<span>Take the breathing room</span></button>
      <button class="transparent" data-act="brCancel">Not now</button></nav>
  </section>`;
}
