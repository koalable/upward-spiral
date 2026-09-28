import { start } from "../main.js";
import routines from "../features/routines.js";
import todos from "../features/todos.js";
start({ page: "routines", features: [routines, todos] });
