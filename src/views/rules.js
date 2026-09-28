import { html } from "../util.js";
import { MAX_DAILY, EDIT_WINDOW_TEXT } from "../constants.js";
import { rule } from "./components.js";

export const gameRules = () => html`
  ${rule("Your total", "", `Each scored question is worth 4. Your points are scaled to 32, plus 1 for checking in, so everyone plays out of ${MAX_DAILY}.`)}
  ${rule("Check-in", "1 point", "For logging the day at all, even a bad one.")}
  ${rule("Streak", "", "Runs on the category you pick under Categories.")}
  ${rule("Floor day", "", "At least 1 point in each of your floor categories. The minimum that counts as showing up.")}
  ${rule("Never miss twice", "", "One missed day happens. The group sees when someone is one miss from two.")}
  ${rule("Streak freezes", "", "Earn one for each week you hit your weekly points goal (bank up to 2). Spend one to save your streak on a missed day.")}
  ${rule("Logging window", "", EDIT_WINDOW_TEXT)}`;
