"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  fadeIn,
  fadeUp,
  fadeDown,
  fadeLeft,
  fadeRight,
  scaleIn,
  zoomIn,
  slideInLeft,
  slideInRight,
  slideUp,
  hoverLift,
  hoverLiftSoft,
  hoverScale,
  hoverScaleSoft,
  hoverGlow,
  popup,
  staggerContainer,
  staggerContainerFast,
  floatY,
  floatYSlow,
} from "../utils/animations";

// ─── Tag map ────────────────────────────────────────────────────────────────

const motionTags = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  section: motion.section,
  span: motion.span,
  button: motion.button,
  form: motion.form,
  aside: motion.aside,
  li: motion.li,
  ul: motion.ul,
  nav: motion.nav,
  header: motion.header,
  footer: motion.footer,
};

function MotionElement({ as = "div", animation, children, ...props }) {
  const Component = motionTags[as] || motion.div;
  return (
    <Component {...animation} {...props}>
      {children}
    </Component>
  );
}

// ─── Fade variants ──────────────────────────────────────────────────────────

export function FadeUp({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...fadeUp, transition: { ...fadeUp.transition, delay } }
    : fadeUp;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function FadeDown({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...fadeDown, transition: { ...fadeDown.transition, delay } }
    : fadeDown;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function FadeIn({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...fadeIn, transition: { ...fadeIn.transition, delay } }
    : fadeIn;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function FadeLeft({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...fadeLeft, transition: { ...fadeLeft.transition, delay } }
    : fadeLeft;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function FadeRight({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...fadeRight, transition: { ...fadeRight.transition, delay } }
    : fadeRight;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

// ─── Scale / zoom ───────────────────────────────────────────────────────────

export function ScaleIn({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...scaleIn, transition: { ...scaleIn.transition, delay } }
    : scaleIn;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function ZoomIn({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...zoomIn, transition: { ...zoomIn.transition, delay } }
    : zoomIn;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

// ─── Slide ──────────────────────────────────────────────────────────────────

export function SlideIn({ as = "div", direction = "left", delay = 0, children, ...props }) {
  const base = direction === "left" ? slideInLeft : slideInRight;
  const anim = delay
    ? { ...base, transition: { ...base.transition, delay } }
    : base;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

export function SlideUp({ as = "div", children, delay = 0, ...props }) {
  const anim = delay
    ? { ...slideUp, transition: { ...slideUp.transition, delay } }
    : slideUp;
  return (
    <MotionElement as={as} animation={anim} {...props}>
      {children}
    </MotionElement>
  );
}

// ─── Pop ────────────────────────────────────────────────────────────────────

export function Popup({ as = "div", children, hover = false, delay = 0, ...props }) {
  const anim = delay
    ? { ...popup, transition: { ...popup.transition, delay } }
    : popup;
  const hoverProps =
    hover === "lift" ? hoverLift
    : hover === "scale" ? hoverScale
    : hover === true ? hoverLiftSoft
    : {};
  return (
    <MotionElement as={as} animation={anim} {...hoverProps} {...props}>
      {children}
    </MotionElement>
  );
}

// ─── Floating element ───────────────────────────────────────────────────────

export function Float({ as = "div", slow = false, children, ...props }) {
  const anim = slow ? floatYSlow : floatY;
  const Component = motionTags[as] || motion.div;
  return (
    <Component {...anim} {...props}>
      {children}
    </Component>
  );
}

// ─── Stagger ────────────────────────────────────────────────────────────────

export function Stagger({ as = "div", fast = false, children, ...props }) {
  const Component = motionTags[as] || motion.div;
  const container = fast ? staggerContainerFast : staggerContainer;
  return (
    <Component
      variants={container.variants}
      initial="initial"
      whileInView="whileInView"
      viewport={container.viewport}
      {...props}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ as = "div", children, hover = false, ...props }) {
  const Component = motionTags[as] || motion.div;
  const hoverProps =
    hover === "lift" ? hoverLift
    : hover === "liftSoft" ? hoverLiftSoft
    : hover === "scale" ? hoverScale
    : hover === "scaleSoft" ? hoverScaleSoft
    : hover === "glow" ? hoverGlow
    : {};
  return (
    <Component
      variants={fadeUp.variants}
      transition={fadeUp.transition}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
}

// ─── Interactive button ─────────────────────────────────────────────────────

export function MotionButton({ children, variant = "scale", ...props }) {
  const hoverProps =
    variant === "lift" ? hoverLift
    : variant === "glow" ? hoverGlow
    : hoverScale;
  return (
    <motion.button {...hoverProps} {...props}>
      {children}
    </motion.button>
  );
}

export function MotionLink({ as: Tag = motion.a, children, variant = "lift", ...props }) {
  const hoverProps =
    variant === "scale" ? hoverScaleSoft
    : hoverLiftSoft;
  return (
    <Tag {...hoverProps} {...props}>
      {children}
    </Tag>
  );
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { AnimatePresence, motion, useScroll, useTransform };
