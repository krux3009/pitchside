import { NavLink, Outlet } from "react-router-dom";

import { useLang } from "../lib/i18n";

const links = [
  { to: "/", key: "nav.home", end: true },
  { to: "/matches", key: "nav.matches" },
  { to: "/players", key: "nav.players" },
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
            ⚽ PITCHSIDE<span className="brand-year">’26</span>
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
    </>
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
