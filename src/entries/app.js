// The home-screen app: all four pages in one bundle, so moving between them is instant. WLC_PAGE = the page
// the address asked for (/, /routines, /work, /progress).
import { start } from "../main.js";
import { CHECKIN_TABS } from "../page.js";
import { ALL_PAGES } from "../allpages.js";

start({ page: window.WLC_PAGE || "checkin", pages: ALL_PAGES, order: CHECKIN_TABS });
