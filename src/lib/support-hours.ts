/**
 * The company's real support hours, per department instruction. Kept as a
 * plain constant (like classify-ticket.ts's keyword rules) rather than an
 * admin-editable setting — there's no request yet for an editor UI, and a
 * fixed schedule is simpler than one more thing that can be misconfigured.
 * Times are in Africa/Nairobi (the app's only timezone — see
 * settings.service.ts's DEFAULT_SETTINGS).
 */
const SCHEDULE: Record<number, { open: string; close: string } | null> = {
  0: null, // Sunday — closed
  1: { open: "08:30", close: "17:30" }, // Monday
  2: { open: "08:30", close: "17:30" }, // Tuesday
  3: { open: "08:30", close: "17:30" }, // Wednesday
  4: { open: "08:30", close: "17:30" }, // Thursday
  5: { open: "08:30", close: "17:30" }, // Friday
  6: { open: "09:00", close: "13:00" }, // Saturday
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nowInNairobi(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort);

  return { day: day < 0 ? 0 : day, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isWithinSupportHours(date: Date = new Date()): boolean {
  const { day, minutes } = nowInNairobi(date);
  const today = SCHEDULE[day];
  if (!today) return false;
  return minutes >= toMinutes(today.open) && minutes < toMinutes(today.close);
}

/** Human-readable hours line for a closed-hours message. */
export function formatSupportHours(): string {
  return "Fri–Thu 8:30am–5:30pm, Sat 9am–1pm, Sun closed";
}

export function closedHoursMessage(): string {
  const { day } = nowInNairobi(new Date());
  return `We're currently closed (it's ${DAY_LABELS[day]} outside our support hours: ${formatSupportHours()}). Leave a message with your contact details and we'll get back to you as soon as we're open.`;
}

/** The screenshot's fallback wording, reused for both the pre-ticket chatbot and the post-ticket live chat. */
export function noResponseFallbackMessage(): string {
  return "Sorry to keep you waiting — unfortunately all of our agents are currently busy or away. Please leave a message and we'll get back to you as soon as possible.";
}
