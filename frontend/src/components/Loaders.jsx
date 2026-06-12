export function ColdStartLoader({ label = "Stadium lights warming up…" }) {
  return (
    <div style={styles.box}>
      <div style={styles.spinner} />
      <p style={{ color: "var(--text-mid)" }}>{label}</p>
      <p style={{ color: "var(--text-low)", fontSize: 12 }}>
        The free server sleeps between matches — first load can take up to a minute.
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 32, margin: 0 }}>🟥</p>
      <p style={{ color: "var(--text-mid)" }}>Couldn’t reach the API.</p>
      <p style={{ color: "var(--text-low)", fontSize: 12 }}>{String(error)}</p>
    </div>
  );
}

const styles = {
  box: { textAlign: "center", padding: "64px 0" },
  spinner: {
    width: 28,
    height: 28,
    margin: "0 auto 12px",
    border: "3px solid var(--line)",
    borderTopColor: "var(--gold)",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
};
