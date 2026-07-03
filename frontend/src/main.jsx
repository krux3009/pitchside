import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { FactBarProvider } from "./lib/factBar";
import { LanguageProvider, useLang } from "./lib/i18n";
import "./styles/global.css";

// One boundary around the whole app: a render throw anywhere becomes a reload
// prompt instead of a white screen. Class component — React still has no hook
// for error boundaries.
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useLang();
  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{t("error.title")}</h1>
      <p style={{ color: "var(--text-mid)" }}>{t("error.body")}</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "8px 20px", borderRadius: "var(--radius-sm)", cursor: "pointer",
          background: "var(--gold)", color: "#0a0e14", border: "none", fontWeight: 600,
        }}
      >
        {t("error.reload")}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <ErrorBoundary>
        <FactBarProvider>
          <App />
        </FactBarProvider>
      </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>
);
