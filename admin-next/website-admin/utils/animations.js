/**
 * Premium Animation System — 9Jobs
 * Centralized spring-based motion variants for a consistent, premium SaaS feel.
 */

export const spring = {
  type: "spring",
  stiffness: 380,
  damping: 28,
};

export const springFast = {
  type: "spring",
  stiffness: 480,
  damping: 22,
};

export const ease = [0.16, 1, 0.3, 1]; // premium cubic-bezier

// ─── Base fade variants ───────────────────────────────────────────────────────

export const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { duration: 0.9, ease },
  viewport: { once: true, margin: "-80px" },
};

export const fadeUp = {
  variants: {
    initial: { opacity: 0, y: 44 },
    whileInView: { opacity: 1, y: 0 },
  },
  initial: "initial",
  whileInView: "whileInView",
  transition: { ...spring, damping: 24 },
  viewport: { once: true, margin: "-50px" },
};

export const fadeDown = {
  initial: { opacity: 0, y: -44 },
  whileInView: { opacity: 1, y: 0 },
  transition: { ...spring, damping: 24 },
  viewport: { once: true, margin: "-50px" },
};

export const fadeLeft = {
  initial: { opacity: 0, x: -48 },
  whileInView: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 26 },
  viewport: { once: true, margin: "-60px" },
};

export const fadeRight = {
  initial: { opacity: 0, x: 48 },
  whileInView: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 26 },
  viewport: { once: true, margin: "-60px" },
};

// ─── Scale / zoom ─────────────────────────────────────────────────────────────

export const scaleIn = {
  initial: { opacity: 0, scale: 0.88 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { ...spring, stiffness: 300, damping: 22 },
  viewport: { once: true, margin: "-40px" },
};

export const zoomIn = {
  initial: { opacity: 0, scale: 0.6 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { ...springFast, damping: 18 },
  viewport: { once: true },
};

// ─── Slide ────────────────────────────────────────────────────────────────────

export const slideInLeft = {
  initial: { opacity: 0, x: -90 },
  whileInView: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 28 },
  viewport: { once: true, margin: "-60px" },
};

export const slideInRight = {
  initial: { opacity: 0, x: 90 },
  whileInView: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 28 },
  viewport: { once: true, margin: "-60px" },
};

export const slideUp = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { ...spring, damping: 26 },
  viewport: { once: true, margin: "-40px" },
};

// ─── Pop / bounce ─────────────────────────────────────────────────────────────

export const popup = {
  initial: { opacity: 0, scale: 0.5 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { ...springFast, stiffness: 520, damping: 16 },
  viewport: { once: true },
};

export const popupDelay = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.5 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { ...springFast, stiffness: 520, damping: 16, delay },
  viewport: { once: true },
});

// ─── Hero enter (used for hero section elements) ──────────────────────────────

export const heroFadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring, damping: 22, delay },
});

export const heroSlideLeft = {
  initial: { opacity: 0, x: -70 },
  animate: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 26, delay: 0.1 },
};

export const heroSlideRight = {
  initial: { opacity: 0, x: 70 },
  animate: { opacity: 1, x: 0 },
  transition: { ...spring, damping: 26, delay: 0.15 },
};

// ─── Hover interactions ────────────────────────────────────────────────────────

export const hoverLift = {
  whileHover: { y: -8, scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: springFast,
};

export const hoverLiftSoft = {
  whileHover: { y: -4, boxShadow: "0 24px 60px rgba(5,5,5,0.14)" },
  whileTap: { scale: 0.98 },
  transition: springFast,
};

export const hoverScale = {
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.94 },
  transition: springFast,
};

export const hoverScaleSoft = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: springFast,
};

export const hoverGlow = {
  whileHover: { scale: 1.04, filter: "brightness(1.08)" },
  whileTap: { scale: 0.96 },
  transition: springFast,
};

// ─── Floating (hero illustration) ────────────────────────────────────────────

export const floatY = {
  animate: {
    y: [0, -14, 0],
    transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const floatYSlow = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
  },
};

// ─── Stagger containers ────────────────────────────────────────────────────────

export const staggerContainer = {
  variants: {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.11,
        delayChildren: 0.08,
      },
    },
  },
  initial: "initial",
  whileInView: "whileInView",
  viewport: { once: true, margin: "-20px" },
};

export const staggerContainerFast = {
  variants: {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.04,
      },
    },
  },
  initial: "initial",
  whileInView: "whileInView",
  viewport: { once: true, margin: "-20px" },
};

// ─── Page transition ──────────────────────────────────────────────────────────

export const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.55, ease },
};
