const TURKEY_TIME_ZONE = "Europe/Istanbul";

function partsOf(ms: number) {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TURKEY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: value("day"),
    month: value("month"),
    year: value("year"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function formatTurkeyDate(ms: number): string {
  if (!ms) return "";
  const p = partsOf(ms);
  return `${p.day}.${p.month}.${p.year}`;
}

export function formatTurkeyStamp(ms = Date.now()): string {
  const p = partsOf(ms);
  return `${p.day}.${p.month}.${p.year} · ${p.hour}:${p.minute}`;
}
