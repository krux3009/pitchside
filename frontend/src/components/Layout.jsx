import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/matches", label: "Matches" },
  { to: "/players", label: "Players" },
  { to: "/methodology", label: "Methodology" },
];

export default function Layout() {
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
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="container" style={{ paddingBottom: 48 }}>
        <Outlet />
      </main>
      <footer style={styles.footer}>
        <div className="container">
          Predictions are statistical estimates for fun, not betting advice. ·{" "}
          A student portfolio project — <a href="https://kruxqlyz.com" style={{ color: "var(--text-mid)" }}>kruxqlyz.com</a>
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
  links: { display: "flex", gap: 18 },
  link: { fontSize: 14, fontWeight: 600 },
  footer: {
    borderTop: "1px solid var(--line)",
    padding: "16px 0 32px",
    color: "var(--text-low)",
    fontSize: 12,
  },
};
