// Kickoffs are stored UTC; render in the visitor's local time.
// locale: undefined = browser default (English UI), "zh-CN" when 中文 is on —
// toLocaleString natively renders 周五 / 6月12日 forms with the same options.

export function localKickoff(iso, locale) {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function localTime(iso, locale) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function localDateHeading(isoDate, locale) {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export const pct = (x) => (x == null ? "–" : Math.round(x * 100) + "%");
