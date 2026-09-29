import { start } from "../main.js";
import checkin from "../features/checkin.js";
import meds from "../features/meds.js";
import dashboard from "../features/dashboard.js";
import notify from "../features/notify.js";
import { CHECKIN_TABS } from "../page.js";
start({ page: "checkin", features: [checkin, meds, dashboard, notify], order: CHECKIN_TABS });
