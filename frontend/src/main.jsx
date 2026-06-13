import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { FactBarProvider } from "./lib/factBar";
import { LanguageProvider } from "./lib/i18n";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <FactBarProvider>
        <App />
      </FactBarProvider>
    </LanguageProvider>
  </StrictMode>
);
