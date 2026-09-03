"use client";

import { useEffect } from "react";

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function DeferredAnalytics({ gaId }) {
  useEffect(() => {
    if (!gaId || typeof window === "undefined" || window.gtag) {
      return undefined;
    }

    let cancelled = false;

    async function bootAnalytics() {
      if (cancelled || window.gtag) return;

      try {
        await injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
        if (cancelled) return;

        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          window.dataLayer.push(arguments);
        };
        window.gtag("js", new Date());
        window.gtag("config", gaId);
      } catch {
        // Ignore analytics load failures to avoid impacting the main experience.
      }
    }

    function triggerBoot() {
      cleanupListeners();
      void bootAnalytics();
    }

    function cleanupListeners() {
      window.removeEventListener("pointerdown", triggerBoot);
      window.removeEventListener("keydown", triggerBoot);
      window.removeEventListener("scroll", triggerBoot);
    }

    window.addEventListener("pointerdown", triggerBoot, { once: true, passive: true });
    window.addEventListener("keydown", triggerBoot, { once: true });
    window.addEventListener("scroll", triggerBoot, { once: true, passive: true });

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [gaId]);

  return null;
}
