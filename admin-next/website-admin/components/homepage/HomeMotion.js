"use client";

import { Children, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useScroll, useSpring, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];
const useReducedMotion = () => false;
function renderMotionTag(as, props, children) {
  switch (as) {
    case "article":
      return <motion.article {...props}>{children}</motion.article>;
    case "header":
      return <motion.header {...props}>{children}</motion.header>;
    case "li":
      return <motion.li {...props}>{children}</motion.li>;
    case "section":
      return <motion.section {...props}>{children}</motion.section>;
    case "span":
      return <motion.span {...props}>{children}</motion.span>;
    case "ul":
      return <motion.ul {...props}>{children}</motion.ul>;
    default:
      return <motion.div {...props}>{children}</motion.div>;
  }
}

function getAxis(direction, distance) {
  switch (direction) {
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: distance };
  }
}

export function Reveal({
  as = "div",
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 32,
  duration = 0.72,
  once = true,
  amount = 0.04,
  style,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  const hiddenAxis = getAxis(direction, distance);

  return renderMotionTag(
    as,
    {
      className,
      initial: reduceMotion ? false : { opacity: 0, ...hiddenAxis },
      whileInView: { opacity: 1, x: 0, y: 0 },
      viewport: { once, amount },
      transition: reduceMotion ? { duration: 0 } : { duration, delay, ease: EASE },
      style: { willChange: "transform, opacity", ...style },
      ...props,
    },
    children
  );
}

export function StaggerContainer({
  as = "div",
  children,
  className,
  delayChildren = 0,
  stagger = 0.1,
  once = true,
  amount = 0.2,
  ...props
}) {
  const reduceMotion = useReducedMotion();

  return renderMotionTag(
    as,
    {
      className,
      variants: {
        hidden: {},
        visible: {
          transition: reduceMotion
            ? { delayChildren: 0, staggerChildren: 0 }
            : { delayChildren, staggerChildren: stagger },
        },
      },
      initial: "hidden",
      whileInView: "visible",
      viewport: { once, amount },
      ...props,
    },
    children
  );
}

export function StaggerItem({
  as = "div",
  children,
  className,
  direction = "up",
  distance = 40,
  duration = 0.72,
  style,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  const hiddenAxis = getAxis(direction, distance);

  return renderMotionTag(
    as,
    {
      className,
      variants: {
        hidden: reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...hiddenAxis },
        visible: { opacity: 1, x: 0, y: 0 },
      },
      transition: reduceMotion ? { duration: 0 } : { duration, ease: EASE },
      style: { willChange: "transform, opacity", ...style },
      ...props,
    },
    children
  );
}

export function FloatingCard({
  children,
  className,
  depth = 18,
  floatRange = 10,
  duration = 6.8,
  delay = 0,
  style,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [depth, -depth]);
  const parallaxSpring = useSpring(parallaxY, {
    stiffness: 90,
    damping: 18,
    mass: 0.2,
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y: reduceMotion ? 0 : parallaxSpring, willChange: "transform", ...style }}
      {...props}
    >
      <motion.div
        style={{ willChange: "transform" }}
        animate={
          reduceMotion
            ? undefined
            : {
                y: [0, -floatRange, 0],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration,
                delay,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1.25,
  prefix = "",
  suffix = "",
  className,
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.55 });
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));

  useEffect(() => {
    if (!isInView) return undefined;

    let frameId = 0;
    const startedAt = performance.now();
    const finalValue = value.toFixed(decimals);

    if (reduceMotion) {
      frameId = window.requestAnimationFrame(() => setDisplay(finalValue));
      return () => window.cancelAnimationFrame(frameId);
    }

    function tick(now) {
      const progress = Math.min((now - startedAt) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((value * eased).toFixed(decimals));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [decimals, duration, isInView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export function Marquee({
  children,
  className,
  itemClassName,
  speed = "34s",
  mobileStatic = false,
  ariaLabel,
}) {
  const items = Children.toArray(children);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`fj-motion-marquee${mobileStatic ? " is-mobile-static" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--marquee-duration": speed }}
      aria-label={ariaLabel}
    >
      <div className="fj-motion-marquee__fade fj-motion-marquee__fade--left" aria-hidden="true" />
      <div className="fj-motion-marquee__fade fj-motion-marquee__fade--right" aria-hidden="true" />
      <div className={`fj-motion-marquee__track${reduceMotion ? " is-reduced" : ""}`}>
        {[...items, ...items].map((child, index) => (
          <div className={itemClassName} key={`marquee-item-${index}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScrollProgressLine({ className }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 35%"],
  });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.2,
  });

  return (
    <div ref={ref} className={`fj-progress-line-shell${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="fj-progress-line-base" />
      <motion.span
        className="fj-progress-line-fill"
        style={{ scaleX: reduceMotion ? 1 : scaleX }}
      />
    </div>
  );
}

export function HoverCard({ children, className, style, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduceMotion ? undefined : { y: -8, scale: 1.015 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{ willChange: "transform", ...style }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedAccordion({ question, answer, isOpen, onToggle }) {
  return (
    <div className={`fj-faq-panel${isOpen ? " is-open" : ""}`} style={{ overflow: "hidden" }}>
      <button
        className="fj-faq-trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{question}</span>
        <motion.span
          className="fj-faq-icon"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 26px 24px" }}>
              <p>{answer}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function PageTransition({ children, style }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: EASE }}
      style={{ willChange: "transform, opacity", ...style }}
    >
      {children}
    </motion.div>
  );
}

export function GradientBlob({ className, style, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`fj-home-orb ${className || ""}`}
      animate={
        reduceMotion
          ? undefined
          : {
              scale: [1, 1.08, 0.96, 1.04, 1],
              rotate: [0, 20, -15, 30, 0],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 14,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
      }
      style={{ willChange: "transform", ...style }}
      {...props}
    />
  );
}
