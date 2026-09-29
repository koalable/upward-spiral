// Preview build: the whole app with pretend data (you with Ada and Bea, or Rosa the beta tester).
import { start } from "../main.js";
import { CHECKIN_TABS } from "../page.js";
import { ALL_PAGES } from "../allpages.js";
import { seedPreview, seedRosa, seedNew } from "../preview.js";

start({ page: window.WLC_PAGE || "checkin", pages: ALL_PAGES, order: CHECKIN_TABS, seed: { rosa: seedRosa, new: seedNew }[window.WLC_PERSONA] || seedPreview });
