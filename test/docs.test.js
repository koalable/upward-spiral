import test from "node:test";
import assert from "node:assert/strict";
import { useStore, memoryAdapter } from "../src/store.js";
import { state } from "../src/state.js";
import { read, edit } from "../src/docs.js";

const tick = () => new Promise((r) => setTimeout(r, 5));

test("read fills in a missing list; edit changes a copy, keeps it and saves it", async () => {
  const db = memoryAdapter();
  useStore(db, { preview: true, status: () => {} });
  state.uid = "u1";
  state.work = null;
  assert.deepEqual(read("work").goals, []);
  const before = state.work;
  edit("work", (w) => { w.goals.push({ id: "g1", name: "Pack" }); }, 0);
  assert.equal(before, null); // the old copy wasn't touched
  assert.equal(state.work.goals[0].name, "Pack");
  await tick();
  assert.equal(db.docs["users/u1/lists/work"].goals[0].name, "Pack");
});

test("edit can return a replacement, and the result is cleaned up", async () => {
  const db = memoryAdapter();
  useStore(db, { preview: true, status: () => {} });
  state.uid = "u2";
  state.todos = { items: [{ id: "a" }] };
  edit("todos", () => ({ items: "not a list" }), 0);
  assert.deepEqual(state.todos.items, []);
  await tick();
  assert.deepEqual(db.docs["users/u2/lists/todos"], { items: [] });
});
