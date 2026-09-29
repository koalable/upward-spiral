// Every page and its features, for bundles that hold the whole app (the home-screen app and the preview).
import checkin from "./features/checkin.js";
import meds from "./features/meds.js";
import dashboard from "./features/dashboard.js";
import notify from "./features/notify.js";
import routines from "./features/routines.js";
import todos from "./features/todos.js";
import work from "./features/work.js";
import progress from "./features/progress.js";
import group from "./features/group.js";

export const ALL_PAGES = { checkin: [checkin, meds, dashboard, notify], routines: [routines, todos], work: [work], progress: [progress, group] };
