// Google Calendar "add event" links for repeating reminders.
import { todayKey, minutesOf, pad2 } from "./util.js";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// days: which weekdays to repeat on (0 = Sunday); omit for every day.
export function dailyReminderLink({ title, time = "21:00", details = "", days }) {
  const day = todayKey().replace(/-/g, "");
  const start = time.replace(":", "") + "00";
  const endMin = minutesOf(time) + 5;
  const end = pad2(Math.floor(endMin / 60) % 24) + pad2(endMin % 60) + "00";
  const recur = days && days.length < 7 ? `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")}` : "RRULE:FREQ=DAILY";
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${day}T${start}/${day}T${end}`, recur, details });
  return `https://calendar.google.com/calendar/render?${params}`;
}
