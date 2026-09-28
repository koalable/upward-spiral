// Preview build: every page in one bundle, with pretend data. The page comes from window.WLC_PAGE.
import { start } from "../main.js";
import { CHECKIN_TABS } from "../page.js";
import { seedPreview } from "../preview.js";
import checkin from "../features/checkin.js";
import meds from "../features/meds.js";
import routines from "../features/routines.js";
import todos from "../features/todos.js";
import progress from "../features/progress.js";
import group from "../features/group.js";

const PAGES = { checkin: [checkin, meds], routines: [routines, todos], progress: [progress, group] };
const id = window.WLC_PAGE in PAGES ? window.WLC_PAGE : "checkin";
start({ page: id, features: PAGES[id], order: CHECKIN_TABS, seed: seedPreview });
