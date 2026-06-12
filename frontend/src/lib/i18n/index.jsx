// Hand-rolled i18n: a context, two dictionaries, and three helpers.
// Deliberately not react-i18next — ~120 keys don't justify a dependency.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { EN } from "./en";
import { EN_NAME_TO_CODE, TEAM_ZH } from "./teams";
import { ZH } from "./zh";

const DICTS = { en: EN, zh: ZH };
const STORAGE_KEY = "pitchside.lang";

// ESPN injury statuses are an open enum; unknown values render as-is.
const INJURY_STATUS_ZH = {
  "Out": "缺阵",
  "Doubtful": "存疑",
  "Questionable": "出场成疑",
  "Day-To-Day": "每日观察",
};

const LanguageContext = createContext(null);

function initialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language?.startsWith("zh") ? "zh" : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const value = useMemo(() => {
    const setLang = (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setLangState(next);
    };
    // missing zh keys degrade to English, never to a raw key on screen
    const t = (key, vars) => {
      const entry = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      return typeof entry === "function" ? entry(vars ?? {}) : entry;
    };
    const tTeam = (code, fallback) =>
      lang === "zh" ? (TEAM_ZH[code] ?? fallback ?? code) : (fallback ?? code);
    // "Mexico U20" -> 墨西哥U20; names outside the 48-team map stay Latin
    const tCountry = (name) => {
      if (lang !== "zh" || !name) return name;
      const m = name.match(/^(.*?)\s+(U-?\d{2})$/);
      const base = m ? m[1] : name;
      const zh = TEAM_ZH[EN_NAME_TO_CODE[base]];
      if (!zh) return name;
      return m ? `${zh}${m[2]}` : zh;
    };
    const tInjuryStatus = (status) =>
      lang === "zh" ? (INJURY_STATUS_ZH[status] ?? status) : status;
    return {
      lang, setLang, t, tTeam, tCountry, tInjuryStatus,
      dateLocale: lang === "zh" ? "zh-CN" : undefined,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
