// Per-team accent color, flag-icons ISO code, and emoji fallback, keyed by
// FIFA code. Flag art is the bundled lipis/flag-icons 4x3 SVG subset
// (src/assets/flags, MIT) — emoji flags don't render on Windows Chrome.

export const TEAMS = {
  MEX: { color: "#0b6b48", iso: "mx", flag: "🇲🇽" },
  RSA: { color: "#e8b923", iso: "za", flag: "🇿🇦" },
  KOR: { color: "#cd2e3a", iso: "kr", flag: "🇰🇷" },
  CZE: { color: "#d7141a", iso: "cz", flag: "🇨🇿" },
  CAN: { color: "#d52b1e", iso: "ca", flag: "🇨🇦" },
  BIH: { color: "#002f6c", iso: "ba", flag: "🇧🇦" },
  QAT: { color: "#8a1538", iso: "qa", flag: "🇶🇦" },
  SUI: { color: "#d52b1e", iso: "ch", flag: "🇨🇭" },
  BRA: { color: "#ffdf00", iso: "br", flag: "🇧🇷" },
  MAR: { color: "#c1272d", iso: "ma", flag: "🇲🇦" },
  HAI: { color: "#00209f", iso: "ht", flag: "🇭🇹" },
  SCO: { color: "#0065bf", iso: "gb-sct", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  USA: { color: "#3c3b6e", iso: "us", flag: "🇺🇸" },
  PAR: { color: "#d52b1e", iso: "py", flag: "🇵🇾" },
  AUS: { color: "#ffc726", iso: "au", flag: "🇦🇺" },
  TUR: { color: "#e30a17", iso: "tr", flag: "🇹🇷" },
  GER: { color: "#ffce00", iso: "de", flag: "🇩🇪" },
  CUW: { color: "#002b7f", iso: "cw", flag: "🇨🇼" },
  CIV: { color: "#f77f00", iso: "ci", flag: "🇨🇮" },
  ECU: { color: "#ffd100", iso: "ec", flag: "🇪🇨" },
  NED: { color: "#ff6f00", iso: "nl", flag: "🇳🇱" },
  JPN: { color: "#bc002d", iso: "jp", flag: "🇯🇵" },
  SWE: { color: "#fecc02", iso: "se", flag: "🇸🇪" },
  TUN: { color: "#e70013", iso: "tn", flag: "🇹🇳" },
  BEL: { color: "#fdda24", iso: "be", flag: "🇧🇪" },
  EGY: { color: "#ce1126", iso: "eg", flag: "🇪🇬" },
  IRN: { color: "#239f40", iso: "ir", flag: "🇮🇷" },
  NZL: { color: "#9aa6ba", iso: "nz", flag: "🇳🇿" },
  ESP: { color: "#c60b1e", iso: "es", flag: "🇪🇸" },
  CPV: { color: "#003893", iso: "cv", flag: "🇨🇻" },
  KSA: { color: "#006c35", iso: "sa", flag: "🇸🇦" },
  URU: { color: "#7da7d8", iso: "uy", flag: "🇺🇾" },
  FRA: { color: "#0055a4", iso: "fr", flag: "🇫🇷" },
  SEN: { color: "#00853f", iso: "sn", flag: "🇸🇳" },
  IRQ: { color: "#ce1126", iso: "iq", flag: "🇮🇶" },
  NOR: { color: "#ba0c2f", iso: "no", flag: "🇳🇴" },
  ARG: { color: "#75aadb", iso: "ar", flag: "🇦🇷" },
  ALG: { color: "#006233", iso: "dz", flag: "🇩🇿" },
  AUT: { color: "#ed2939", iso: "at", flag: "🇦🇹" },
  JOR: { color: "#ce1126", iso: "jo", flag: "🇯🇴" },
  POR: { color: "#046a38", iso: "pt", flag: "🇵🇹" },
  COD: { color: "#007fff", iso: "cd", flag: "🇨🇩" },
  UZB: { color: "#1eb53a", iso: "uz", flag: "🇺🇿" },
  COL: { color: "#fcd116", iso: "co", flag: "🇨🇴" },
  ENG: { color: "#cf081f", iso: "gb-eng", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  CRO: { color: "#171796", iso: "hr", flag: "🇭🇷" },
  GHA: { color: "#fcd116", iso: "gh", flag: "🇬🇭" },
  PAN: { color: "#da121a", iso: "pa", flag: "🇵🇦" },
};

const FLAGS = import.meta.glob("../assets/flags/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export const teamColor = (code) => TEAMS[code]?.color ?? "#5d6b82";
export const teamFlag = (code) => TEAMS[code]?.flag ?? "⚽";
export const teamFlagUrl = (code) => {
  const iso = TEAMS[code]?.iso;
  return iso ? FLAGS[`../assets/flags/${iso}.svg`] : null;
};
