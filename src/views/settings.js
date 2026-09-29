// Settings (the gear): Customize what shows and what it's called, and Account (look, linked accounts, sign out).
// Categories, Targets & scoring and Notifications are the existing views, moved here.
import { html } from "../util.js";
import { state, settings } from "../state.js";
import { PAGES } from "../page.js";
import { getPref } from "../prefs.js";
import { TEXT_SIZES } from "../constants.js";
import { normalizeLayout, pageLabel, pageIcon, pageHidden, tabHidden, sectionHidden, HIDEABLE_PAGES, HIDEABLE_TABS, SECTIONS, PAGE_ICON_CHOICES, PAGE_ICONS } from "../layout.js";
import { linkedPanel } from "./targets.js";
import { icon, pressed, saveStatus } from "./components.js";


function swatch(on, act, data, label) {
  return html`<button class="switchrow" data-act="${act}" ${data} aria-pressed="${pressed(on)}"><span class="max">${label}</span><span class="sw${on ? " on" : ""}" aria-hidden="true"></span></button>`;
}

export function customizeView() {
  const l = normalizeLayout(settings().layout);
  const presets = [["full", "Everything", "All pages and tabs."], ["simple", "Simple", "Check-in and Work only. Habits and Progress hidden."]];
  return html`
    <section class="panel"><h2>Start from</h2>
      <div class="presets">${presets.map(([id, name, hint]) => html`<button class="preset${l.preset === id ? " on" : ""}" data-act="layoutPreset" data-preset="${id}" aria-pressed="${pressed(l.preset === id)}">
        <b>${name}</b><span class="small-text">${hint}</span></button>`)}</div>
      ${l.preset === "custom" ? html`<p class="hint">Custom: your own mix below.</p>` : ""}
      <p class="hint">Hiding something only takes it off the screen. Its data stays, and it comes back as it was.</p></section>
    <section class="panel"><h2>Pages</h2>
      ${HIDEABLE_PAGES.map(([id, fallback]) => html`<div class="pagecfg">
        ${swatch(!pageHidden(l, id), "layoutToggle", html`data-key="hidePages" data-id="${id}"`, html`${icon(pageIcon(l, id, PAGE_ICONS[id]))} ${pageLabel(l, id, fallback)}`)}
        ${id === "work" && !pageHidden(l, id) ? html`<div class="renamerow">
          <label class="field"><span>Name</span><input data-layout-name="${id}" maxlength="16" placeholder="${fallback}" value="${l.names[id] || ""}"></label>
          <label class="field"><span>Icon</span><select data-layout-icon="${id}">${PAGE_ICON_CHOICES.map(([k, label]) => html`<option value="${k}" ${k === pageIcon(l, id, "work") ? "selected" : ""}>${label}</option>`)}</select></label></div>` : ""}
      </div>`)}</section>
    <section class="panel"><h2>Tabs</h2>
      ${PAGES.filter(([id]) => HIDEABLE_TABS[id] && !pageHidden(l, id)).map(([id, fallback]) => html`<h3 class="cfghead">${pageLabel(l, id, fallback)}</h3>
        ${HIDEABLE_TABS[id].map(([tab, label]) => swatch(!tabHidden(l, tab), "layoutToggle", html`data-key="hideTabs" data-id="${tab}"`, label))}`)}</section>
    <section class="panel"><h2>On Check-in → Today</h2>
      ${SECTIONS.map(([id, label]) => swatch(!sectionHidden(l, id), "layoutToggle", html`data-key="hideSections" data-id="${id}"`, label))}
      <p class="hint">What you track is set under Categories.</p>${saveStatus()}</section>`;
}

export function accountView() {
  const dark = getPref("theme") !== "light", size = Number(getPref("fs")) || TEXT_SIZES[0];
  return html`
    <section class="panel"><h2>Look</h2>
      ${swatch(dark, "theme", "", "Dark mode")}
      <div class="row textsize"><span class="max">Text size</span>
        <button class="border small" data-act="textSmaller" ${size === TEXT_SIZES[0] ? "disabled" : ""} aria-label="Smaller text">A−</button>
        <button class="border small" data-act="textLarger" ${size === TEXT_SIZES[TEXT_SIZES.length - 1] ? "disabled" : ""} aria-label="Larger text">A+</button></div></section>
    ${linkedPanel()}
    <section class="panel"><h2>Account</h2>
      <p>${state.preview ? "Preview" : html`Signed in as <b>${state.email}</b>`}</p>
      ${state.preview ? "" : html`<button class="border" data-act="signOut">Sign out</button>`}</section>`;
}
