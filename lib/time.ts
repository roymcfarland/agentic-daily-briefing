const CHICAGO_TIME_ZONE = "America/Chicago";

export function getChicagoDateLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

export function getChicagoDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}
