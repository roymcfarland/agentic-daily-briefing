const CHICAGO_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

export function isWeekdayMorningWindow(now: Date): boolean {
  const parts = CHICAGO_FORMATTER.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  if (!weekday || ["Sat", "Sun"].includes(weekday)) {
    return false;
  }

  return hour === 6 && minute === 30;
}

export function getChicagoDateLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}
