import { useLang } from "../lib/i18n";

// Skeleton shell while data loads. The cold-start caption stays: Render's free
// tier sleeps between matches, so the first request can take up to a minute and
// users need that expectation set, not just a shimmer.
export function ColdStartLoader() {
  const { t } = useLang();
  return (
    <div style={{ marginTop: 28 }}>
      <div className="skeleton" style={{ height: 34, width: 220, marginBottom: 18 }} />
      <div className="skeleton-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 132 }} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }} role="status">
        <p style={{ color: "var(--text-mid)", margin: 0 }}>{t("loader.warming")}</p>
        <p style={{ color: "var(--text-low)", fontSize: 12, marginTop: 4 }}>
          {t("loader.coldStart")}
        </p>
      </div>
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
};
