// Food: a quick meal log inside the Diet category. Meals live on the day (a.meals); their totals fill the
// day's calories and protein, so scoring doesn't change. Water and fruit & veg are simple counts.
//   meal: { id, name, cal, pro, hunger (1–5, optional), at (ms) }
//   favorites: settings.foods = [{ name, cal, pro }]
import { toNum, newId } from "./util.js";

export const HUNGER = [[1, "Not hungry"], [2, "A little"], [3, "Hungry"], [4, "Very"], [5, "Starving"]];
export const MAX_FAVORITES = 12;

export function mealTotals(a) {
  const meals = a?.meals || [];
  return { cal: meals.reduce((n, m) => n + toNum(m.cal), 0), pro: meals.reduce((n, m) => n + toNum(m.pro), 0), count: meals.length };
}

// Meals drive the day's calories and protein. With none logged, those are typed by hand as before.
export function syncTotals(a) {
  if (!a.meals?.length) { delete a.meals; return a; }
  const t = mealTotals(a);
  a.calories = Math.round(t.cal);
  a.protein = Math.round(t.pro);
  return a;
}

export function addMeal(a, m, at = Date.now(), id = newId("m")) {
  const name = String(m.name || "").trim().slice(0, 60);
  if (!name) return null;
  const meal = { id, name, cal: Math.max(0, Math.round(toNum(m.cal))), pro: Math.max(0, Math.round(toNum(m.pro))), at };
  const h = Math.round(toNum(m.hunger));
  if (h >= 1 && h <= 5) meal.hunger = h;
  (a.meals ??= []).push(meal);
  syncTotals(a);
  return meal;
}

export function removeMeal(a, id) {
  const had = a.meals?.length;
  a.meals = (a.meals || []).filter((m) => m.id !== id);
  if (had && !a.meals.length) { delete a.calories; delete a.protein; }
  return syncTotals(a);
}

// Counting fruit & veg servings ticks the "fruit and veg goal" once you reach your target.
export function setServings(a, n, target) {
  a.fv = Math.max(0, Math.round(toNum(n)));
  a.fruitVeg = a.fv >= Math.max(1, toNum(target));
  return a;
}

export const sameFood = (x, y) => x.name.trim().toLowerCase() === y.name.trim().toLowerCase();
export const isFavorite = (foods, meal) => (foods || []).some((f) => sameFood(f, meal));

// Star a meal to keep it as a one-tap favorite; star again to drop it.
export function toggleFavorite(foods = [], meal) {
  if (isFavorite(foods, meal)) return foods.filter((f) => !sameFood(f, meal));
  return [{ name: meal.name, cal: toNum(meal.cal), pro: toNum(meal.pro) }, ...foods].slice(0, MAX_FAVORITES);
}

// Average hunger before eating, for a quick read on the day.
export function avgHunger(a) {
  const hs = (a?.meals || []).map((m) => m.hunger).filter(Boolean);
  return hs.length ? Math.round((hs.reduce((n, h) => n + h, 0) / hs.length) * 10) / 10 : null;
}
