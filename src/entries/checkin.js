import { start } from "../main.js";
import checkin from "../features/checkin.js";
import meds from "../features/meds.js";
import dashboard from "../features/dashboard.js";
import { CHECKIN_TABS } from "../page.js";
start({ page: "checkin", features: [checkin, meds, dashboard], order: CHECKIN_TABS });
