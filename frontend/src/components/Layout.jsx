import { NavLink, Outlet } from "react-router-dom";

import { useLang } from "../lib/i18n";
import FactBar from "./FactBar";

const links = [
  { to: "/", key: "nav.home", end: true },
  { to: "/matches", key: "nav.matches" },
  { to: "/groups", key: "nav.groups" },
  { to: "/bracket", key: "nav.bracket" },
  { to: "/players", key: "nav.players" },
  { to: "/compare", key: "nav.compare" },
  { to: "/methodology", key: "nav.methodology" },
];

export default function Layout() {
  const { lang, setLang, t } = useLang();
  return (
    <>
      <a className="skip-link" href="#main">{t("a11y.skip")}</a>
      <nav className="site-nav">
        <div className="container site-nav__inner">
          <NavLink to="/" className="brand">
            <BrandMark /> PITCHSIDE<span className="brand-year">’26</span>
          </NavLink>
          <div className="site-nav__links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              >
                {t(l.key)}
              </NavLink>
            ))}
            <NavLink to="/gamba" className="gamba-pill">🎲 {t("nav.gamba")}</NavLink>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              aria-label="切换语言 / switch language"
              className="lang-toggle"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>
      </nav>
      <main id="main" className="container" style={{ paddingBottom: 48 }}>
        <Outlet />
      </main>
      <footer style={styles.footer}>
        <div className="container">
          {t("footer.disclaimer")} ·{" "}
          {t("footer.project")} <a href="https://kruxqlyz.com" style={{ color: "var(--text-mid)" }}>kruxqlyz.com</a>
        </div>
      </footer>
      <FactBar />
    </>
  );
}

// the favicon mark, inlined so the nav brand matches the tab icon exactly
function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"
         style={{ verticalAlign: "-4px", marginRight: 2 }}>
      <rect width="64" height="64" rx="14" fill="var(--bg-elevated)" />
      <path d="M0 47 Q32 36 64 47 L64 64 L0 64 Z" fill="var(--grass)" />
      <circle cx="32" cy="27" r="14" fill="var(--gold)" />
      <polygon points="32,19.5 39.2,24.7 36.4,33.2 27.6,33.2 24.8,24.7" fill="var(--bg-pitch)" />
    </svg>
  );
}

const styles = {
  footer: {
    borderTop: "1px solid var(--line)",
    padding: "16px 0 32px",
    color: "var(--text-low)",
    fontSize: 12,
  },
};
