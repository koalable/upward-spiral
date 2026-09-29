// One render path. render() redraws the current tab; patch() updates live numbers in place.
// Remote data changes redraw only when it won't disrupt someone mid-edit.
import { html, escapeText } from "./util.js";
import { APP_NAME, TEXT_SIZES } from "./constants.js";
import { state, formOpen } from "./state.js";
import { getPref, setPref } from "./prefs.js";
import { icon } from "./views/components.js";
import { page, PAGES, pageUrl, everyFeature, anyFeature, SETTINGS_TABS, setPage, pageOfTab } from "./page.js";
import { normalizeLayout, pageLabel, pageIcon, pageHidden, tabHidden, PAGE_ICONS } from "./layout.js";
import { parseRoute, formatRoute } from "./route.js";
import morphdom from "morphdom";
import { joinView } from "./views/join.js";

export const ui = { root: null, view: null };


export function mountShell(root) {
  ui.root = root;
  root.classList.add("ui");
  root.innerHTML = String(html`<div class="shell">
    <header class="top"><nav>
      <h6 class="max title">${APP_NAME}</h6>
      <button class="circle transparent" data-act="openSettings" aria-label="Settings" id="gear">${icon("settings")}</button>
    </nav><div class="small-text who" id="who"></div></header>
    <nav class="pages wrap" aria-label="Pages">${PAGES.map(([id, label]) => html`<a class="chip ${id === page.id ? "fill" : ""}" data-page="${id}" href="${pageUrl(id)}"${id === page.id ? html` aria-current="page"` : ""}>${icon(PAGE_ICONS[id] || "circle")}<span>${label}</span></a>`)}</nav>
    <div class="setbar" id="setbar" hidden><button class="transparent" data-act="closeSettings">${icon("arrow_back")}<span>Done</span></button><h2>Settings</h2></div>
    <div class="tabs left-align" role="tablist" aria-label="Sections" id="tabs" hidden></div>
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
  const btn = ui.root.querySelector("#theme-btn");
  if (btn) btn.innerHTML = String(icon(dark ? "light_mode" : "dark_mode"));
}
export function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  setPref("theme", next);
  applyTheme(next);
}
export function applyTextSize(px) {
  const size = TEXT_SIZES.includes(px) ? px : TEXT_SIZES[0];
  ui.root.style.setProperty("--size", `${size}px`);
  const less = ui.root.querySelector('[data-act="textSmaller"]'), more = ui.root.querySelector('[data-act="textLarger"]');
  if (less) less.disabled = size === TEXT_SIZES[0];
  if (more) more.disabled = size === TEXT_SIZES[TEXT_SIZES.length - 1];
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
// Drawing: a new screen (another tab, goal or page) replaces what's there; a redraw of the same screen only
// changes what's different, so nothing jumps, flashes or replays its animation. Things you've folded open stay
// open, the field you're typing in is left alone, and areas marked data-live (updated in place, like the rings)
// are left to their own updater.
let shown = "";
export function showScreen(content, key = "") {
  if (key !== shown || !ui.view.firstElementChild) {
    shown = key;
    ui.view.innerHTML = String(content);
    return;
  }
  const next = document.createElement("main");
  next.innerHTML = String(content);
  morphdom(ui.view, next, {
    childrenOnly: true,
    onBeforeElUpdated(from, to) {
      if (from === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(from.tagName)) return false;
      if (from.tagName === "DETAILS") to.open = from.open || to.hasAttribute("open");
      return !from.isEqualNode(to);
    },
    onBeforeElChildrenUpdated: (from) => !("live" in from.dataset),
  });
}

// Which tabs show: the page's own tabs, or the Settings tabs, minus anything hidden under Customize.
export const layoutNow = () => normalizeLayout(state.settings?.layout);
const inSettings = (id) => SETTINGS_TABS.includes(id);
export const settingsOpen = () => inSettings(state.tab);
export const tabShown = (id) => (settingsOpen() ? inSettings(id) : !inSettings(id)) && !tabHidden(layoutNow(), id);

// Names, icons and hidden pages from Customize, on the page switcher.
function applyLayout() {
  const l = layoutNow();
  for (const a of ui.root.querySelectorAll("nav.pages [data-page]")) {
    const id = a.dataset.page, label = PAGES.find(([p]) => p === id)[1];
    a.hidden = pageHidden(l, id);
    a.querySelector("span").textContent = pageLabel(l, id, label);
    a.querySelector("i").className = `icon-${ICON_CLASS(pageIcon(l, id, PAGE_ICONS[id]))}`;
  }
  ui.root.querySelector("#setbar").hidden = !settingsOpen();
  ui.root.classList.toggle("settings-mode", settingsOpen());
}
const ICON_CLASS = (name) => String(icon(name)).match(/icon-([\w-]+)/)[1];

// The page follows the tab (every tab belongs to one page). Moving to another page redraws the tabs row,
// the page switcher and the title, and remembers where you'd scrolled to on the page you left.
const tabsFor = () => String(html`${page.tabs.map(([id, label]) => html`<a role="tab" id="tab-${id}" data-tab="${id}" aria-controls="wlc-panel">${label}</a>`)}`);
const scrolled = {};
let chromeFor = "";
function syncPage() {
  const home = pageOfTab(state.tab);
  if (home && home !== page.id) { scrolled[page.id] = window.scrollY; setPage(home); }
  if (chromeFor === page.id) return false;
  const first = !chromeFor;
  chromeFor = page.id;
  ui.root.querySelector("#tabs").innerHTML = tabsFor();
  for (const a of ui.root.querySelectorAll("nav.pages [data-page]")) {
    const on = a.dataset.page === page.id;
    a.classList.toggle("fill", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  const title = PAGES.find(([p]) => p === page.id)?.[1];
  if (title && !first) document.title = `${pageLabel(layoutNow(), page.id, title)} · Spiral`;
  return !first;
}

function syncTabs() {
  const moved = syncPage();
  applyLayout();
  if (!tabShown(state.tab)) state.tab = page.tabs.map(([id]) => id).find(tabShown) || page.tabs[0][0];
  for (const tab of ui.root.querySelectorAll("[role=tab]")) {
    const on = tab.dataset.tab === state.tab;
    tab.hidden = !tabShown(tab.dataset.tab);
    tab.setAttribute("aria-selected", String(on));
    tab.classList.toggle("active", on);
    tab.tabIndex = on ? 0 : -1;
  }
  ui.view.setAttribute("aria-labelledby", `tab-${state.tab}`);
  return moved;
}

// ---------- rendering ----------
// The address bar follows the route, so the back gesture steps back through screens.
let drawn = false;
function syncAddress() {
  // In the installed app the path names the page too (/work#wgoals), so a reload opens the same screen.
  const path = window.WLC_CONFIG?.app && location.protocol.startsWith("http") ? pageUrl(page.id) : location.pathname;
  const want = path + formatRoute(state.route);
  if (location.pathname + location.hash === want) return;
  if (drawn) history.pushState(null, "", want); else history.replaceState(null, "", want);
}
export function followAddress() {
  window.addEventListener("popstate", () => { state.route = parseRoute(location.hash); state.sheet = null; render(); });
}

export function render() {
  const moved = syncTabs();
  syncAddress();
  drawn = true;
  if (!state.loaded) return showScreen(`<p class="muted">${escapeText("Loading…")}</p>`);
  if (!state.members[state.uid] && state.tab !== "group") return showScreen(joinView());
  const view = (page.tabs.find(([id]) => id === state.tab) || page.tabs[0])[2];
  // Same tab and goal = same screen (switching milestone tabs just updates it).
  showScreen(view(), `${page.id}|${state.route.tab}|${state.route.goal || ""}`);
  if (moved) window.scrollTo(0, scrolled[page.id] || 0);
  patch();
}

// The page switcher: go to another page where you left it (same tab, same goal), without reloading.
const lastRoute = {};
export function goPage(id) {
  lastRoute[page.id] = state.route;
  state.sheet = null;
  state.route = lastRoute[id] || { tab: page.pages[id][0][0] };
  render();
}

export function patch() {
  if (!state.loaded || !state.members[state.uid]) return;
  everyFeature("patch", state.tab, ui.view);
}

// Someone mid-edit keeps their place: only live numbers update.
function isBusy() {
  const active = document.activeElement;
  const typing = active && ui.view.contains(active) && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
  return typing || formOpen() || anyFeature("busy", ui.view);
}
export function refreshAfterRemoteChange() {
  if (!state.loaded) return;
  if (anyFeature("liveTab", state.tab) || isBusy()) patch();
  else render();
}
