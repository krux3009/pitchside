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
      <nav style={styles.nav}>
        <div className="container" style={styles.navInner}>
          <NavLink to="/" style={styles.brand}>
            ⚽ PITCHSIDE<span style={styles.brandYear}>’26</span>
          </NavLink>
          <div style={styles.links}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({
                  ...styles.link,
                  color: isActive ? "var(--gold)" : "var(--text-mid)",
                })}
              >
                {t(l.key)}
              </NavLink>
            ))}
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              aria-label="切换语言 / switch language"
              style={styles.langToggle}
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>
      </nav>
      <main className="container" style={{ paddingBottom: 48 }}>
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
  nav: {
    borderBottom: "1px solid var(--line)",
    background: "var(--bg-surface)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  navInner: { display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  brand: { fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 1 },
  brandYear: { color: "var(--gold)" },
  links: { display: "flex", gap: 18, alignItems: "center" },
  link: { fontSize: 14, fontWeight: 600 },
  langToggle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-mid)",
    background: "none",
    border: "1px solid var(--line)",
    borderRadius: 6,
    padding: "3px 9px",
    cursor: "pointer",
  },
  footer: {
    borderTop: "1px solid var(--line)",
    padding: "16px 0 32px",
    color: "var(--text-low)",
    fontSize: 12,
  },
};
