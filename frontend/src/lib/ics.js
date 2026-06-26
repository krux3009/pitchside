// One-match calendar reminder, built client-side. No backend, no library —
// the slice of RFC 5545 a single VEVENT needs is tiny, and a calendar's own
// alarm fires the reminder even when the site is closed (works on iOS too).

const SITE = "https://worldcup.kruxqlyz.com";

// kickoff_utc is ISO UTC ("2026-06-11T19:00:00Z"). ICS basic UTC drops the
// separators -> "20260611T190000Z". No timezone code: a Z time is localised by
// the calendar app itself (same principle as the format.js kickoff comment).
const toIcsUtc = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// RFC 5545 text escaping: backslash, comma, semicolon, newline.
const esc = (s) => String(s).replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

export function buildMatchIcs(m, t) {
  const home = m.home_name ?? m.home_slot ?? "TBD";
  const away = m.away_name ?? m.away_slot ?? "TBD";
  const summary = `${home} v ${away} · ${t("ics.title")}`;
  const start = toIcsUtc(m.kickoff_utc);
  // 2h block so the calendar slot looks like a match, not a point in time.
  const end = toIcsUtc(new Date(new Date(m.kickoff_utc).getTime() + 2 * 3600e3).toISOString());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//pitchside//worldcup//EN",
    "BEGIN:VEVENT",
    // Stable UID -> re-adding the same match updates the event, no duplicate.
    `UID:pitchside-match-${m.id}@kruxqlyz.com`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc(summary)}`,
    m.venue ? `LOCATION:${esc(m.venue)}` : null,
    `DESCRIPTION:${esc(`${SITE}/matches/${m.id}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(summary)}`,
    "TRIGGER:-PT5M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function downloadMatchIcs(m, t) {
  const blob = new Blob([buildMatchIcs(m, t)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `match-${m.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
