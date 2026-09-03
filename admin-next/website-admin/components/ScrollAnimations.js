"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealRules = [
  [".fj-hero .fj-announcement, .fj-page-hero .fj-announcement", "fade-down", 0],
  [".fj-hero h1, .fj-page-hero h1", "fade-up", 70],
  [".fj-hero p, .fj-page-hero p", "fade-up", 140],
  [".fj-actions", "fade-up", 210],
  [".fj-hero-dashboard, .fj-dashboard", "slide-from-bottom", 120],
  [".fj-home-hero-shell .fj-home-orb", "fade-in", 0],
  [".fj-trust, .fj-quote-panel, .fj-final-cta", "zoom-in", 0],
  [".fj-section-head > *, .fj-copy-block > *", "fade-up", 0],
  [".fj-image-card, .fj-card-media, .fj-leader-media", "fade-in", 0],
  [".fj-contact-panel", "fade-left", 0],
  [".fj-contact-form-slot", "fade-right", 90],
  [".fj-footer", "fade-up", 0],
  [".fj-social-back-link", "fade-left", 0],
  [".fj-social-detail", "fade-up", 90],
  [".site-main h1, .site-main h2, .site-main h3", "fade-up", 0],
  [".site-main p, .site-main li, .site-main label, .site-main input, .site-main textarea, .site-main select", "fade-up", 70],
];

const cardSelector = [
  ".fj-feature-card",
  ".fj-plan-card",
  ".fj-pricing-card",
  ".fj-blog-card",
  ".fj-team-card",
  ".fj-mini-item",
  ".fj-activity-card",
  ".fj-role-card",
  ".fj-ai-card",
  ".fj-faq-item",
  ".fj-contact-hours",
].join(", ");

const rowSelector = [
  ".fj-table-row",
  ".fj-activity-row",
  ".fj-role-row",
  ".fj-task-row",
  ".fj-chip-list span",
  ".fj-price-list span",
  ".fj-logo-row span",
  ".fj-integration-grid span",
  ".fj-footer-links a",
].join(", ");

function toArray(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function markElement(element, type, delay = 0) {
  if (!element || element.dataset.fjRevealBound === "true") return;
  if (element.closest("[data-fj-motion-root='true']")) return;
  element.dataset.fjReveal = type;
  element.dataset.fjRevealBound = "true";
  element.style.setProperty("--reveal-delay", `${Math.min(delay, 520)}ms`);
}

function markList(elements, type, baseDelay = 0, step = 70) {
  elements.forEach((element, index) => markElement(element, type, baseDelay + index * step));
}

export default function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = false;
    const cleanupTimers = [];
    let cleanupSetup = () => {};

    function setup() {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );

      function runSetup() {
        revealRules.forEach(([selector, type, delay]) => {
          markList(toArray(selector), type, delay, 55);
        });

        toArray(".fj-section").forEach((section) => {
          markElement(section, "smooth-section", 0);
          markList(toArray(cardSelector, section), "zoom-in", 60, 80);
          markList(toArray(rowSelector, section), "fade-up", 70, 50);
        });

        toArray(".fj-split").forEach((split) => {
          Array.from(split.children).forEach((child, index) => {
            markElement(child, index % 2 === 0 ? "slide-from-left" : "slide-from-right", index * 90);
          });
        });

        toArray(".fj-card-grid, .fj-list-grid, .fj-integration-grid, .fj-logo-row, .fj-footer-grid").forEach((group) => {
          group.dataset.fjStagger = "true";
          Array.from(group.children).forEach((child, index) => {
            if (!child.dataset.fjRevealBound) {
              markElement(child, index % 2 === 0 ? "fade-up" : "fade-in", index * 65);
            }
          });
        });

        toArray(".fj-hero-doodle, .fj-dashboard, .fj-image-card, .fj-leader-media, .fj-ai-card, .fj-home-parallax-card, .fj-home-orb").forEach((element, index) => {
          element.dataset.fjParallax = index % 2 === 0 ? "18" : "-14";
        });

        const revealElements = toArray("[data-fj-reveal]");

        if (reduceMotion) {
          revealElements.forEach((element) => element.classList.add("is-visible"));
        } else {
          revealElements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            const startsInView = rect.top < window.innerHeight * 0.94 && rect.bottom > -40;

            if (startsInView) {
              element.classList.add("is-visible");
            } else {
              observer.observe(element);
            }
          });
        }
        measureParallax();
      }

      runSetup();

      let setupTimer = null;
      const mutationObserver = new MutationObserver((mutations) => {
        let added = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            added = true;
            break;
          }
        }
        if (added) {
          if (setupTimer) clearTimeout(setupTimer);
          setupTimer = setTimeout(runSetup, 60);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });

      let frame = 0;
      let cachedParallax = [];

      function measureParallax() {
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        cachedParallax = toArray("[data-fj-parallax]").map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element,
            offsetTop: rect.top + scrollTop,
            height: rect.height,
            strength: Number(element.dataset.fjParallax || 16),
          };
        });
      }

      function updateParallax() {
        frame = 0;
        const viewportHeight = window.innerHeight || 1;
        const scrollTop = window.scrollY || window.pageYOffset || 0;

        cachedParallax.forEach((item) => {
          const currentTop = item.offsetTop - scrollTop;
          const currentBottom = currentTop + item.height;

          if (currentBottom < -120 || currentTop > viewportHeight + 120) return;

          const centerY = currentTop + item.height / 2;
          const progress = (viewportHeight / 2 - centerY) / viewportHeight;
          item.element.style.setProperty("--parallax-y", `${(progress * item.strength).toFixed(2)}px`);
        });
      }

      function requestParallax() {
        if (!frame) frame = window.requestAnimationFrame(updateParallax);
      }

      function handleResize() {
        measureParallax();
        requestParallax();
      }

      measureParallax();
      requestParallax();
      window.addEventListener("scroll", requestParallax, { passive: true });
      window.addEventListener("resize", handleResize);

      return () => {
        observer.disconnect();
        mutationObserver.disconnect();
        if (setupTimer) clearTimeout(setupTimer);
        window.removeEventListener("scroll", requestParallax);
        window.removeEventListener("resize", handleResize);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const timer = window.setTimeout(() => {
      cleanupSetup = setup() || (() => {});
    }, 80);
    cleanupTimers.push(timer);

    return () => {
      cleanupTimers.forEach((item) => window.clearTimeout(item));
      cleanupSetup();
    };
  }, [pathname]);

  return null;
}
