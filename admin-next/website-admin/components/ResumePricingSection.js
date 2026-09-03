"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, ArrowRight, FileCheck, Zap, RotateCw, PenTool } from "lucide-react";
import { CalendlyLink } from "./CalendlyWidget";
import PricingCheckoutButton from "./PricingCheckoutButton";

const resumePlans = [
  {
    name: "Resume Makeover",
    price: "$49",
    period: "one-time",
    description: "Professional resume redesign tailored for ATS systems to get you noticed.",
    items: [
      "Resume redesign (ATS-friendly)",
      "Optimized formatting & structure",
      "Grammar & wording improvements",
      "Industry-specific keyword optimization",
      "Achievement-focused content",
      "PDF delivery (ATS & Recruiter friendly)"
    ],
    initial: { opacity: 0, x: -90, rotate: -2, skewY: -2.5 },
    animate: { opacity: 1, x: 0, rotate: -2, skewY: -2.5 },
    hover: { 
      scale: 1.04, 
      rotate: -0.5, 
      y: -10, 
      skewY: -2.5,
      boxShadow: "0 25px 60px rgba(16, 185, 129, 0.28)",
      borderColor: "#84cc16"
    },
    delay: 0,
    dark: true
  },
  {
    name: "Resume, LinkedIn & SEEK Optimisation",
    badge: "Most Popular",
    price: "$89",
    period: "one-time",
    description: "Complete professional branding to boost your Resume, LinkedIn, and SEEK profile visibility.",
    items: [
      "Everything in Resume Makeover",
      "LinkedIn profile optimization",
      "SEEK profile optimization",
      "Headline & About section rewrite",
      "Experience & skills enhancement",
      "ATS & search keyword targeting",
      "Profile visibility improvements",
      "PDF delivery & profile guides"
    ],
    initial: { opacity: 0, x: 90, rotate: 2, skewY: -2.5, scale: 1.05 },
    animate: { opacity: 1, x: 0, rotate: 2, skewY: -2.5, scale: 1.05 },
    hover: { 
      scale: 1.09, 
      rotate: 0.5, 
      y: -10, 
      skewY: -2.5,
      boxShadow: "0 25px 60px rgba(16, 185, 129, 0.32)",
      borderColor: "#10b981"
    },
    delay: 0.15,
    dark: false
  }
];

const trustItems = [
  { icon: FileCheck, label: "ATS-friendly" },
  { icon: Zap, label: "Fast turnaround" },
  { icon: RotateCw, label: "Unlimited revisions" },
  { icon: PenTool, label: "Human-written" }
];

export default function ResumePricingSection() {
  const containerRef = useRef(null);
  
  // Parallax Scroll Tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Parallax shifts for floating background rhombus shapes
  const yParallax1 = useTransform(scrollYProgress, [0, 1], [-60, 60]);
  const yParallax2 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const yParallax3 = useTransform(scrollYProgress, [0, 1], [-90, 90]);

  return (
    <section ref={containerRef} className="fj-section fj-resume-section">
      {/* Background Blobs */}
      <div className="fj-resume-bg-blob fj-resume-bg-blob--1" />
      <div className="fj-resume-bg-blob fj-resume-bg-blob--2" />

      {/* Floating Parallax Rhombus Outlines */}
      <motion.div
        style={{
          position: "absolute",
          width: "110px",
          height: "110px",
          border: "1.5px solid rgba(16, 185, 129, 0.16)",
          borderRadius: "20px",
          top: "15%",
          left: "6%",
          y: yParallax1,
          zIndex: 2,
          pointerEvents: "none"
        }}
        animate={{ rotate: [45, 52, 45] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        style={{
          position: "absolute",
          width: "80px",
          height: "80px",
          background: "linear-gradient(135deg, rgba(132, 204, 22, 0.04) 0%, rgba(16, 185, 129, 0.08) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.18)",
          borderRadius: "16px",
          bottom: "22%",
          right: "8%",
          y: yParallax2,
          zIndex: 2,
          pointerEvents: "none"
        }}
        animate={{ rotate: [45, 38, 45] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        style={{
          position: "absolute",
          width: "44px",
          height: "44px",
          border: "1px solid rgba(132, 204, 22, 0.22)",
          borderRadius: "8px",
          top: "35%",
          right: "48%",
          y: yParallax3,
          zIndex: 2,
          pointerEvents: "none"
        }}
        animate={{ rotate: [45, 65, 45] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main Content Container */}
      <div className="fj-container fj-resume-container">
        {/* Section Heading & Subheading */}
        <motion.div 
          className="fj-section-head"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.span 
            className="fj-announcement" 
            style={{ margin: "0 auto 16px" }}
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <span>One-Time Packages</span> Premium upgrades
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Resume & <span className="heading-mark">Profile Optimization</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            One-time professional upgrades for job seekers who don’t need weekly support.
          </motion.p>
        </motion.div>

        {/* 2 Slanted Symmetrical Rhombus Cards Grid */}
        <div className="fj-resume-cards-grid">
          {resumePlans.map((plan) => (
            <motion.article
              key={plan.name}
              className={`fj-resume-skew-card ${plan.dark ? "is-premium-dark" : "is-premium-glass"}`}
              initial={plan.initial}
              whileInView={plan.animate}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 24,
                delay: plan.delay
              }}
              whileHover={plan.hover}
            >
              {/* Soft blur glow inside card */}
              <div className="fj-card-glow-bg" />

              {/* Unskewed inner content */}
              <div className="fj-resume-skew-card-inner">
                {/* Badge */}
                {plan.badge && (
                  <span className="fj-badge is-green-gradient" style={{ alignSelf: "flex-start", marginBottom: "20px" }}>
                    {plan.badge}
                  </span>
                )}

                <h2>{plan.name}</h2>
                <p style={{ marginTop: "8px", fontSize: "0.94rem", lineHeight: "1.5" }}>{plan.description}</p>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "24px 0 8px" }}>
                  <strong style={{ fontSize: "3rem", fontWeight: "900", lineHeight: "1" }}>{plan.price}</strong>
                  <span style={{ fontSize: "1rem", color: plan.dark ? "rgba(255, 255, 255, 0.5)" : "var(--fj-muted)", fontWeight: "600" }}>
                    / {plan.period}
                  </span>
                </div>

                {/* Checklist Items: flexGrow enforces equal height alignment */}
                <div className="fj-price-list" style={{ marginTop: "16px", marginBottom: "36px", flexGrow: 1 }}>
                  {plan.items.map((item, idx) => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.35,
                        delay: plan.delay + 0.25 + idx * 0.08,
                        ease: "easeOut"
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.96rem" }}
                    >
                      <Check size={18} style={{ flexShrink: 0 }} /> {item}
                    </motion.span>
                  ))}
                </div>

                {/* Actions: Bright neon green primary buttons and transparent border secondary buttons */}
                <div className="fj-pricing-actions" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <PricingCheckoutButton
                    plan={plan}
                    className="fj-button is-green-glow fj-button--lime"
                    style={{ width: "100%" }}
                  />
                  <CalendlyLink 
                    className={`fj-button is-green-glow ${plan.dark ? "is-dark-ghost" : "is-light-ghost"}`}
                    style={{ width: "100%" }}
                  >
                    Get started <ArrowRight size={17} />
                  </CalendlyLink>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Small Trust Strip */}
        <motion.div 
          className="fj-resume-trust-strip"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="fj-resume-trust-item">
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
