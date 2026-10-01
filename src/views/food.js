// The food log inside the Diet card: favorites, today's meals (with hunger before eating), and the add form.
import { html, clock } from "../util.js";
import { settings, sheet } from "../state.js";
import { HUNGER, isFavorite, avgHunger } from "../food.js";
import { icon, pressed } from "./components.js";

const hungerSeg = (act, h, id = "") => html`<span class="seg hunger" role="group" aria-label="Hunger before eating">${HUNGER.map(([n, label]) =>
  html`<button data-act="${act}" ${id ? html`data-id="${id}"` : ""} data-h="${n}" title="${label}" aria-label="${label}" aria-pressed="${pressed(h === n)}">${n}</button>`)}</span>`;

function mealRow(m, foods) {
  const fav = isFavorite(foods, m);
  return html`<li class="meal">
    <span class="mtime">${clock(m.at)}</span>
    <span class="mname"><b>${m.name}</b><span class="muted small">${m.cal || 0} cal · ${m.pro || 0} g</span></span>
    <button class="circle transparent small" data-act="mealStar" data-id="${m.id}" aria-pressed="${pressed(fav)}" aria-label="${fav ? "Remove from favorites" : "Save as favorite"}">${icon("star")}</button>
    <button class="x" data-act="mealDel" data-id="${m.id}" aria-label="Remove ${m.name}">×</button>
    <span class="mhunger"><span class="small-text muted">Hunger</span>${hungerSeg("mealHunger", m.hunger, m.id)}</span></li>`;
}

function mealForm(d) {
  return html`<div class="mealform">
    <input class="field wide" data-draft="name" maxlength="60" value="${d.name || ""}" placeholder="What did you eat?" aria-label="Meal" id="meal-name">
    <div class="row"><label class="lbl" for="meal-cal">Calories</label><input class="field" id="meal-cal" type="number" inputmode="numeric" min="0" data-draft="cal" data-num value="${d.cal ?? ""}" placeholder="rough is fine">
      <label class="lbl" for="meal-pro">Protein (g)</label><input class="field" id="meal-pro" type="number" inputmode="numeric" min="0" data-draft="pro" data-num value="${d.pro ?? ""}"></div>
    <div class="row"><span class="lbl">Hunger before</span>${hungerSeg("mealDraftHunger", d.hunger)}</div>
    <label class="tog small"><input type="checkbox" data-draft="fav" ${d.fav ? "checked" : ""}> Save as a favorite</label>
    <nav class="wrap"><button data-act="mealSave">${icon("check")}<span>Log it</span></button><button class="transparent" data-act="mealCancel">Cancel</button></nav></div>`;
}

export function foodLog(a) {
  const foods = settings().foods || [], meals = [...(a.meals || [])].sort((x, y) => x.at - y.at), d = sheet("meal");
  const h = avgHunger(a);
  return html`<div class="foodlog">
    <div class="sub"><span>Meals${h ? html` <span class="muted small">· avg hunger ${h}</span>` : ""}</span></div>
    ${foods.length ? html`<div class="chips favs">${foods.map((f, i) => html`<button class="chip border small" data-act="mealFav" data-i="${i}">+ ${f.name}<span class="muted small">${f.cal ? ` ${f.cal}` : ""}</span></button>`)}</div>` : ""}
    ${meals.length ? html`<ul class="meals">${meals.map((m) => mealRow(m, foods))}</ul>` : ""}
    ${d ? mealForm(d) : html`<button class="btn ghost small" data-act="mealNew">${icon("add")}<span>Add a meal or snack</span></button>`}
    ${!meals.length && !d ? html`<p class="hint small">Log meals and your calories and protein add up on their own. Or just type the totals below.</p>` : ""}</div>`;
}

// A tap-to-count row (water, fruit & veg) with dots toward the day's target.
export function counter(key, label, value, target) {
  const n = Number(value) || 0, of = Math.max(1, Number(target) || 1);
  return html`<div class="row counter"><span class="lbl">${label}</span>
    <span class="step"><button data-act="foodStep" data-key="${key}" data-by="-1" aria-label="One less">−</button><b class="cnum">${n}</b><button data-act="foodStep" data-key="${key}" data-by="1" aria-label="One more">+</button></span>
    <span class="cof"><span class="pdots" aria-hidden="true">${Array.from({ length: Math.max(of, n) }, (_, i) => html`<i class="${i < n ? "on" : ""}${i >= of ? " extra" : ""}"></i>`)}</span>
    <span class="muted small">of ${of}</span></span></div>`;
}
