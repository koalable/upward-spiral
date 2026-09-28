// Calendar reminders: Google Calendar "add event" links, and .ics files for Apple Calendar (iPhone/Mac).
import { todayKey, minutesOf, pad2 } from "./util.js";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function parts({ time = "21:00", days }) {
  const day = todayKey().replace(/-/g, "");
  const start = time.replace(":", "") + "00";
  const endMin = minutesOf(time) + 5;
  const end = pad2(Math.floor(endMin / 60) % 24) + pad2(endMin % 60) + "00";
  const rule = days && days.length < 7 ? `FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")}` : "FREQ=DAILY";
  return { day, start, end, rule };
}

// days: which weekdays to repeat on (0 = Sunday); omit for every day.
export function dailyReminderLink(opts) {
  const { day, start, end, rule } = parts(opts);
  const params = new URLSearchParams({ action: "TEMPLATE", text: opts.title, dates: `${day}T${start}/${day}T${end}`, recur: `RRULE:${rule}`, details: opts.details || "" });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function icsText(opts) {
  const { day, start, rule } = parts(opts);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Upward Spiral//Reminders//EN", "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@kstarr.com`, `DTSTAMP:${stamp}`,
    `DTSTART:${day}T${start}`, "DURATION:PT5M", `RRULE:${rule}`,
    `SUMMARY:${esc(opts.title)}`, `DESCRIPTION:${esc(opts.details || "")}`, `URL:${location.href}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", `DESCRIPTION:${esc(opts.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}

// iPhone Safari opens a calendar file straight into "Add to Calendar"; other browsers download it.
export function openIcs(opts) {
  const url = URL.createObjectURL(new Blob([icsText(opts)], { type: "text/calendar;charset=utf-8" }));
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) location.href = url;
  else {
    const a = document.createElement("a");
    a.href = url; a.download = `${opts.title.replace(/[^\w ]+/g, "").trim() || "reminder"}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
