import test from "node:test";
import assert from "node:assert/strict";
import { state } from "../src/state.js";
import { setLogsTime, logsOn } from "../src/meds.js";
import { atTime } from "../src/util.js";
import { useStore, memoryAdapter } from "../src/store.js";
useStore(memoryAdapter());

test("bulk edit sets several logged doses to one date and time, keeping doses", () => {
  state.uid = "u1";
  state.settings = { cats: [], meds: [] };
  state.medlog = {
    "2026-09-30": { date: "2026-09-30", items: [
      { id: "a", name: "Lisinopril", dose: "10", unit: "mg", at: atTime("2026-09-30", "07:30") },
      { id: "b", name: "Vitamin D", dose: "2000", unit: "IU", at: atTime("2026-09-30", "07:31") },
      { id: "c", name: "Coffee", dose: "", unit: "", at: atTime("2026-09-30", "09:00") },
    ] },
  };
  assert.equal(setLogsTime(["2026-09-30|a", "2026-09-30|b", "2026-09-30|zzz"], "2026-09-30", "08:15"), 2);
  const day = logsOn("2026-09-30");
  assert.deepEqual(day.map((x) => [x.id, new Date(x.at).getHours(), new Date(x.at).getMinutes()]), [["a", 8, 15], ["b", 8, 15], ["c", 9, 0]]);
  assert.equal(day.find((x) => x.id === "a").dose, "10");
  // moving to another day moves them to that day's log
  setLogsTime(["2026-09-30|a", "2026-09-30|b"], "2026-09-29", "21:00");
  assert.deepEqual(logsOn("2026-09-29").map((x) => x.id), ["a", "b"]);
  assert.deepEqual(logsOn("2026-09-30").map((x) => x.id), ["c"]);
});
