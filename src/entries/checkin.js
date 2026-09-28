import { start } from "../main.js";
import checkin from "../features/checkin.js";
import meds from "../features/meds.js";
import { CHECKIN_TABS } from "../page.js";
start({ page: "checkin", features: [checkin, meds], order: CHECKIN_TABS });
