// Kickoffs are stored UTC; render in the visitor's local time.

export function localKickoff(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function localTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function localDateHeading(isoDate) {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export const pct = (x) => (x == null ? "–" : Math.round(x * 100) + "%");

export const STAGE_LABEL = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  THIRD: "Third Place",
  FINAL: "Final",
};
