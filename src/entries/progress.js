import { start } from "../main.js";
import progress from "../features/progress.js";
import group from "../features/group.js";
start({ page: "progress", features: [progress, group] });
