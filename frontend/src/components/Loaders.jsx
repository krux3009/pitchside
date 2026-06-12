import { useLang } from "../lib/i18n";

export function ColdStartLoader({ label }) {
  const { t } = useLang();
  return (
    <div style={styles.box}>
      <div style={styles.spinner} />
      <p style={{ color: "var(--text-mid)" }}>{label ?? t("loader.warming")}</p>
      <p style={{ color: "var(--text-low)", fontSize: 12 }}>
        {t("loader.coldStart")}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ error }) {
  const { t } = useLang();
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 32, margin: 0 }}>🟥</p>
      <p style={{ color: "var(--text-mid)" }}>{t("loader.apiError")}</p>
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
