import test from "node:test";
import assert from "node:assert/strict";
import { addMeal, removeMeal, setServings, toggleFavorite, isFavorite, avgHunger, mealTotals } from "../src/food.js";

test("meals add up into the day's calories and protein", () => {
  const a = { calories: 999 };
  addMeal(a, { name: "Eggs & toast", cal: 350, pro: 20, hunger: 4 }, 1, "m1");
  addMeal(a, { name: "Salad", cal: "450", pro: 30 }, 2, "m2");
  assert.equal(a.calories, 800);
  assert.equal(a.protein, 50);
  assert.equal(a.meals[0].hunger, 4);
  assert.ok(!("hunger" in a.meals[1]));
  assert.equal(avgHunger(a), 4);
  assert.deepEqual(mealTotals(a), { cal: 800, pro: 50, count: 2 });
});

test("a meal needs a name; removing the last meal clears the totals", () => {
  const a = {};
  assert.equal(addMeal(a, { name: "  ", cal: 100 }), null);
  addMeal(a, { name: "Apple", cal: 95 }, 1, "m1");
  removeMeal(a, "m1");
  assert.ok(!("meals" in a) && !("calories" in a) && !("protein" in a));
});

test("fruit & veg servings tick the goal at the target", () => {
  const a = {};
  setServings(a, 4, 5);
  assert.equal(a.fruitVeg, false);
  setServings(a, 5, 5);
  assert.equal(a.fruitVeg, true);
});

test("favorites toggle by name, newest first, capped", () => {
  let foods = toggleFavorite([], { name: "Yogurt", cal: 150, pro: 15 });
  assert.ok(isFavorite(foods, { name: "yogurt " }));
  foods = toggleFavorite(foods, { name: "YOGURT" });
  assert.equal(foods.length, 0);
  for (let i = 0; i < 20; i++) foods = toggleFavorite(foods, { name: `F${i}` });
  assert.equal(foods.length, 12);
  assert.equal(foods[0].name, "F19");
});
