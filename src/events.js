// Wiring: clicks go to the page's actions; typing and changes go to whichever feature claims them.
import { state } from "./state.js";
import { page, findAction, anyFeature, everyFeature } from "./page.js";
import { ui, render, patch } from "./render.js";

function run(result) {
  if (result === "none") return;
  if (result === "patch") patch();
  else render();
}

export function switchTab(tab) {
  state.tab = tab;
  render();
}

function onClick(event) {
  const tab = event.target.closest("[role=tab]");
  if (tab) return switchTab(tab.dataset.tab);
  const el = event.target.closest("[data-act]");
  if (!el || !ui.root.contains(el)) return;
  const action = findAction(el.dataset.act);
  if (action) run(action(el, event));
}

// Arrow keys move between tabs (WAI-ARIA tabs pattern).
function onTabKey(event) {
  const tab = event.target.closest("[role=tab]");
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return false;
  event.preventDefault();
  const ids = page.tabs.map(([id]) => id), i = ids.indexOf(tab.dataset.tab);
  const next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: ids.length - 1 }[event.key];
  switchTab(ids[(next + ids.length) % ids.length]);
  ui.root.querySelector(`#tab-${state.tab}`).focus();
  return true;
}

export function bindEvents(root) {
  root.addEventListener("click", onClick);
  root.addEventListener("input", (event) => anyFeature("input", event.target, event));
  root.addEventListener("change", (event) => anyFeature("change", event.target, event));
  root.addEventListener("keydown", (event) => onTabKey(event) || anyFeature("keydown", event));
}
