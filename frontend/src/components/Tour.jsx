import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useLang } from "../lib/i18n";

// Spotlight onboarding tour: dims the page, rings one REAL element at a time,
// explains it in a sentence. Fires once per storageKey (any exit marks it
// seen); replay links simply clear the key and navigate back.
//
// steps: [{ anchor: CSS selector, title: i18n key, body: i18n key,
//           onEnter?: fn }] — a step whose anchor never appears is skipped.
// theme: extra class on the portal root ("gamba" restyles to paper tickets,
// needed because the portal renders outside the .gamba scope).
export default function Tour({ steps, storageKey, theme, onEnd }) {
  const { t } = useLang();
  const [i, setI] = useState(() => (localStorage.getItem(storageKey) ? -1 : 0));
  const [rect, setRect] = useState(null);

  const step = i >= 0 ? steps[i] : null;

  const finish = () => {
    localStorage.setItem(storageKey, "1");
    setI(-1);
    setRect(null);
    onEnd?.();
  };
  const next = () => (i < steps.length - 1 ? (setRect(null), setI(i + 1)) : finish());

  useEffect(() => {
    if (!step) return undefined;
    step.onEnter?.();
    let tries = 0;
    let raf;
    const measure = (el) => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // the anchor may only exist a few frames after onEnter (demo pick -> sheet)
    const seek = () => {
      const el = document.querySelector(step.anchor);
      if (el) {
        el.scrollIntoView({ block: "center", inline: "center" });
        measure(el);
      } else if (++tries < 40) {
        raf = requestAnimationFrame(seek);
      } else {
        next(); // anchor never showed up (e.g. no open market) — skip the step
      }
    };
    seek();
    const reglue = () => {
      const el = document.querySelector(step.anchor);
      if (el) measure(el);
    };
    const onKey = (e) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", reglue);
    window.addEventListener("scroll", reglue, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reglue);
      window.removeEventListener("scroll", reglue, true);
    };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!step || !rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = rect.top + rect.height / 2 < vh / 2;
  const tipW = Math.min(340, vw - 24);
  const tipLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - tipW / 2), vw - tipW - 12);

  return createPortal(
    <div className={`tour-root${theme ? ` tour-root--${theme}` : ""}`} onClick={finish}>
      <div
        className="tour-ring"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        className="tour-tip"
        role="dialog"
        aria-label={t(step.title)}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: tipW,
          left: tipLeft,
          ...(below
            ? { top: Math.min(rect.top + rect.height + 14, vh - 190) }
            : { bottom: Math.min(vh - rect.top + 14, vh - 80) }),
        }}
      >
        <div className="tour-tip__title">{t(step.title)}</div>
        <p className="tour-tip__body">{t(step.body)}</p>
        <div className="tour-tip__foot">
          <span className="tour-tip__dots" aria-hidden="true">
            {steps.map((_, d) => (
              <i key={d} className={d === i ? "on" : ""} />
            ))}
          </span>
          <button className="tour-tip__skip" onClick={finish}>{t("tour.skip")}</button>
          <button className="tour-tip__next" onClick={next}>
            {i === steps.length - 1 ? t("tour.done") : t("tour.next")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
