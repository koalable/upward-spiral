// One render path. render() redraws the current tab; patch() updates live numbers in place.
// Remote data changes redraw only when it won't disrupt someone mid-edit.
import { html, escapeText } from "./util.js";
import { APP_NAME, TEXT_SIZES } from "./constants.js";
import { state } from "./state.js";
import { getPref, setPref } from "./prefs.js";
import { icon } from "./views/components.js";
import { page, PAGES, pageUrl, everyFeature, anyFeature } from "./page.js";
import { joinView } from "./views/join.js";

export const ui = { root: null, view: null };

const PAGE_ICONS = { checkin: "edit_note", routines: "checklist", progress: "insights", work: "work" };

export function mountShell(root) {
  ui.root = root;
  root.classList.add("ui");
  root.innerHTML = String(html`<div class="shell">
    <header class="top"><nav>
      <h6 class="max title">${APP_NAME}</h6>
      <button class="circle transparent" data-act="textSmaller" aria-label="Smaller text">A−</button>
      <button class="circle transparent" data-act="textLarger" aria-label="Larger text">A+</button>
      <button class="circle transparent" data-act="theme" aria-label="Toggle light or dark" id="theme-btn"></button>
    </nav><div class="small-text who" id="who"></div></header>
    <nav class="pages wrap" aria-label="Challenge pages">${PAGES.map(([id, label]) => html`<a class="chip ${id === page.id ? "fill" : ""}" href="${pageUrl(id)}"${id === page.id ? html` aria-current="page"` : ""}>${icon(PAGE_ICONS[id] || "circle")}<span>${label}</span></a>`)}</nav>
    <div class="tabs left-align" role="tablist" aria-label="Sections" id="tabs" hidden>
      ${page.tabs.map(([id, label]) => html`<a role="tab" id="tab-${id}" data-tab="${id}" aria-controls="wlc-panel">${label}</a>`)}</div>
    <div id="banner" role="status" aria-live="polite"></div>
    <main id="wlc-panel" role="tabpanel"><p class="small-text">Loading…</p></main></div>`);
  ui.view = root.querySelector("#wlc-panel");
  applyTheme(getPref("theme"));
  applyTextSize(Number(getPref("fs")) || TEXT_SIZES[0]);
}

// ---------- theme and text size ----------
// Dark by default; the choice is remembered per device.
const isDark = () => ui.root.classList.contains("dark");
export function applyTheme(theme) {
  const dark = theme !== "light";
  ui.root.classList.toggle("dark", dark);
  ui.root.classList.toggle("light", !dark);
  ui.root.querySelector("#theme-btn").innerHTML = String(icon(dark ? "light_mode" : "dark_mode"));
}
export function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  setPref("theme", next);
  applyTheme(next);
}
export function applyTextSize(px) {
  const size = TEXT_SIZES.includes(px) ? px : TEXT_SIZES[0];
  ui.root.style.setProperty("--size", `${size}px`);
  ui.root.querySelector('[data-act="textSmaller"]').disabled = size === TEXT_SIZES[0];
  ui.root.querySelector('[data-act="textLarger"]').disabled = size === TEXT_SIZES[TEXT_SIZES.length - 1];
  return size;
}
export function stepTextSize(dir) {
  const current = TEXT_SIZES.indexOf(Number(getPref("fs")) || TEXT_SIZES[0]);
  const size = TEXT_SIZES[Math.max(0, Math.min(TEXT_SIZES.length - 1, current + dir))];
  setPref("fs", size);
  applyTextSize(size);
}

// ---------- chrome ----------
export function setBanner(message, tone = "") {
  ui.root.querySelector("#banner").innerHTML = message ? String(html`<div class="banner ${tone}">${message}</div>`) : "";
}
export function setWho(content) { ui.root.querySelector("#who").innerHTML = String(content); }
export function setStatus(text) { const el = ui.root.querySelector("#saved"); if (el) el.textContent = text; }
export function showTabs(visible) { ui.root.querySelector("#tabs").hidden = !visible; }
export function showScreen(content) { ui.view.innerHTML = String(content); }

function syncTabs() {
  for (const tab of ui.root.querySelectorAll("[role=tab]")) {
    const on = tab.dataset.tab === state.tab;
    tab.setAttribute("aria-selected", String(on));
    tab.classList.toggle("active", on);
    tab.tabIndex = on ? 0 : -1;
  }
  ui.view.setAttribute("aria-labelledby", `tab-${state.tab}`);
}

// ---------- rendering ----------
export function render() {
  syncTabs();
  if (!state.loaded) return showScreen(`<p class="muted">${escapeText("Loading…")}</p>`);
  if (!state.members[state.uid] && state.tab !== "group") return showScreen(joinView());
  const view = (page.tabs.find(([id]) => id === state.tab) || page.tabs[0])[2];
  showScreen(view());
  patch();
}

export function patch() {
  if (!state.loaded || !state.members[state.uid]) return;
  everyFeature("patch", state.tab, ui.view);
}

// Someone mid-edit keeps their place: only live numbers update.
function isBusy() {
  const active = document.activeElement;
  const typing = active && ui.view.contains(active) && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
  return typing || anyFeature("busy", ui.view);
}
export function refreshAfterRemoteChange() {
  if (!state.loaded) return;
  if (anyFeature("liveTab", state.tab) || isBusy()) patch();
  else render();
}
