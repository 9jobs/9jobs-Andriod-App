"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Reveal, StaggerContainer, StaggerItem, AnimatedCounter } from "./HomeMotion";
import { motion } from "framer-motion";
import {
  UserCheck,
  FileText,
  SendHorizontal,
  Calendar,
  Trophy,
  Target,
  ArrowRight,
  ArrowDown,
  UsersRound,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Star,
} from "lucide-react";

// Excel Custom Icon Component
const ExcelIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#107C41" />
    <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="white" strokeWidth="1.5" opacity="0.8" />
    <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="1.5" opacity="0.5" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="1.5" opacity="0.5" />
    <path d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// WhatsApp Custom Icon Component
const WhatsAppIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.762.455 3.486 1.325 5.006L2 22l5.127-1.305a9.948 9.948 0 004.877 1.31h.005c5.52 0 10-4.48 10-10.001C22.009 6.48 17.524 2 12.004 2zm5.122 13.626c-.225.63-1.306 1.205-1.791 1.25-.432.04-1.002.062-2.909-.723-2.437-1.002-3.993-3.483-4.113-3.644-.12-.16-.98-1.307-.98-2.493 0-1.186.621-1.768.841-2.009.22-.24.48-.301.641-.301h.461c.12 0 .28-.04.441.321.16.361.54 1.323.591 1.423.05.1.09.221.02.361-.07.14-.15.301-.26.422-.11.12-.22.25-.32.36-.11.12-.23.25-.09.492.14.241.621 1.022 1.332 1.654.912.812 1.683 1.063 1.923 1.183.24.12.381.1.521-.06.14-.161.601-.702.762-.942.16-.24.32-.2.54-.12.22.08 1.4.661 1.64.781.24.12.4.18.46.28.06.1.06.582-.16 1.212z" />
  </svg>
);

const steps = [
  {
    number: "01",
    title: "Onboarding",
    text: "You share your details and career goals. We understand your profile and needs.",
    icon: UserCheck,
    accentColor: "#8b5cf6",
    accentLight: "rgba(139, 92, 246, 0.08)",
    accentBorder: "rgba(139, 92, 246, 0.15)",
  },
  {
    number: "02",
    title: "Resume Optimization",
    text: "We create ATS-friendly, keyword-optimized resumes for LinkedIn, SEEK, Jora & Indeed.",
    icon: FileText,
    accentColor: "#3b82f6",
    accentLight: "rgba(59, 130, 246, 0.08)",
    accentBorder: "rgba(59, 130, 246, 0.15)",
  },
  {
    number: "03",
    title: "Daily Job Applications",
    text: "We apply upto 20 matched jobs daily and proactively reach out to hiring managers using premium recruitment tools—helping boost your interview chances up to 10×.",
    icon: SendHorizontal,
    accentColor: "#06b6d4",
    accentLight: "rgba(6, 182, 212, 0.08)",
    accentBorder: "rgba(6, 182, 212, 0.15)",
    badge: "20 Jobs Every Day",
  },
  {
    number: "04",
    title: "Tracking in Excel",
    text: "We maintain an Excel sheet with Date, Company, Position, Email & Status for full transparency.",
    icon: ExcelIcon,
    accentColor: "#10b981",
    accentLight: "rgba(16, 185, 129, 0.08)",
    accentBorder: "rgba(16, 185, 129, 0.15)",
  },
  {
    number: "05",
    title: "Daily Updates",
    text: "You receive daily updates on WhatsApp with Excel sheet and screenshots of applied jobs for complete clarity.",
    icon: WhatsAppIcon,
    accentColor: "#22c55e",
    accentLight: "rgba(34, 197, 94, 0.08)",
    accentBorder: "rgba(34, 197, 94, 0.15)",
  },
  {
    number: "06",
    title: "Weekly Target",
    text: "We apply to 80 jobs in 1 week to maximize your exposure and increase interview opportunities.",
    icon: Target,
    accentColor: "#f59e0b",
    accentLight: "rgba(245, 158, 11, 0.08)",
    accentBorder: "rgba(245, 158, 11, 0.15)",
    badge: "80 Jobs Per Week",
  },
  {
    number: "07",
    title: "Interview Scheduling",
    text: "Interviews lined up? We schedule, reschedule and prepare you for success.",
    icon: Calendar,
    accentColor: "#ea580c",
    accentLight: "rgba(234, 88, 12, 0.08)",
    accentBorder: "rgba(234, 88, 12, 0.15)",
  },
  {
    number: "08",
    title: "You Get Hired!",
    text: "Get your dream job in Australia and build the future you deserve.",
    icon: Trophy,
    accentColor: "#a855f7",
    accentLight: "rgba(168, 85, 247, 0.08)",
    accentBorder: "rgba(168, 85, 247, 0.15)",
  },
];

const stats = [
  {
    label: "Clients",
    number: "100+",
    numberValue: 100,
    numberSuffix: "+",
    icon: UsersRound,
    color: "#8b5cf6",
    lightColor: "rgba(139, 92, 246, 0.08)",
  },
  {
    label: "Jobs Applied Per Day",
    number: "20+",
    numberValue: 20,
    numberSuffix: "+",
    icon: CheckCircle2,
    color: "#10b981",
    lightColor: "rgba(16, 185, 129, 0.08)",
  },
  {
    label: "Interviews Per Week",
    number: "2+",
    numberValue: 2,
    numberSuffix: "+",
    icon: TrendingUp,
    color: "#3b82f6",
    lightColor: "rgba(59, 130, 246, 0.08)",
  },
  {
    label: "Commitment",
    number: "100%",
    numberValue: 100,
    numberSuffix: "%",
    icon: ShieldCheck,
    color: "#6366f1",
    lightColor: "rgba(99, 102, 241, 0.08)",
  },
  {
    label: "Proven Results",
    number: "Real Success Stories",
    icon: Star,
    color: "#f59e0b",
    lightColor: "rgba(245, 158, 11, 0.08)",
    isTextLabel: true,
  },
];

export default function FlowchartSection() {
  const [coords, setCoords] = useState(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const cardRefs = useRef([]);

  useEffect(() => {
    const updateCoords = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCoords(null);
        setIsDesktopLayout(false);
        return;
      }

      setIsDesktopLayout(width >= 1024);

      const container = document.getElementById("flowchart-container");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newCoords = {};

      for (let i = 1; i <= 8; i++) {
        const card = cardRefs.current[i - 1];
        if (card) {
          const rect = card.getBoundingClientRect();
          newCoords[i] = {
            left: rect.left - containerRect.left,
            right: rect.right - containerRect.left,
            top: rect.top - containerRect.top,
            bottom: rect.bottom - containerRect.top,
            width: rect.width,
            height: rect.height,
            centerX: rect.left - containerRect.left + rect.width / 2,
            centerY: rect.top - containerRect.top + rect.height / 2,
            // badge center is exactly the top-left corner of the card
            badgeX: rect.left - containerRect.left,
            badgeY: rect.top - containerRect.top,
          };
        }
      }
      setCoords(newCoords);
    };

    updateCoords();
    const timer1 = setTimeout(updateCoords, 150);
    const timer2 = setTimeout(updateCoords, 1200); // Recalculate after entrance stagger animation completes
    window.addEventListener("resize", updateCoords);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", updateCoords);
    };
  }, []);

  const renderPaths = () => {
    if (!coords) return null;

    const paths = [];

    const drawArrowhead = (x, y, dir, color, delay) => {
      let d = "";
      if (dir === "right") {
        d = `M ${x - 8} ${y - 5} L ${x} ${y} L ${x - 8} ${y + 5}`;
      } else if (dir === "left") {
        d = `M ${x + 8} ${y - 5} L ${x} ${y} L ${x + 8} ${y + 5}`;
      } else if (dir === "down") {
        d = `M ${x - 5} ${y - 8} L ${x} ${y} L ${x + 5} ${y - 8}`;
      }

      return (
        <motion.path
          key={`arrow-${dir}-${x}-${y}`}
          d={d}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: delay + 0.4, ease: "backOut" }}
        />
      );
    };

    if (isDesktopLayout) {
      const dx = 48; // curvature

      // 1 -> 2
      paths.push(
        <motion.path
          key="path-1-2"
          d={`M ${coords[1].right} ${coords[1].centerY} L ${coords[2].left - 8} ${coords[2].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[0].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 0.1 }}
        />
      );
      paths.push(drawArrowhead(coords[2].left - 8, coords[2].centerY, "right", steps[1].accentColor, 0.1));

      // 2 -> 3
      paths.push(
        <motion.path
          key="path-2-3"
          d={`M ${coords[2].right} ${coords[2].centerY} L ${coords[3].left - 8} ${coords[3].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[1].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 0.5 }}
        />
      );
      paths.push(drawArrowhead(coords[3].left - 8, coords[3].centerY, "right", steps[2].accentColor, 0.5));

      // 3 -> 4
      paths.push(
        <motion.path
          key="path-3-4"
          d={`M ${coords[3].right} ${coords[3].centerY} L ${coords[4].left - 8} ${coords[4].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[2].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 0.9 }}
        />
      );
      paths.push(drawArrowhead(coords[4].left - 8, coords[4].centerY, "right", steps[3].accentColor, 0.9));

      // 4 -> 5 (straight down on the right)
      paths.push(
        <motion.path
          key="path-4-5"
          d={`M ${coords[4].centerX} ${coords[4].bottom} L ${coords[5].centerX} ${coords[5].top - 12}`}
          className="flowchart-svg-path"
          stroke={steps[3].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 1.3 }}
        />
      );
      paths.push(drawArrowhead(coords[5].centerX, coords[5].top - 12, "down", steps[4].accentColor, 1.3));

      // 5 -> 6
      paths.push(
        <motion.path
          key="path-5-6"
          d={`M ${coords[5].left} ${coords[5].centerY} L ${coords[6].right + 8} ${coords[6].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[4].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 1.7 }}
        />
      );
      paths.push(drawArrowhead(coords[6].right + 8, coords[6].centerY, "left", steps[5].accentColor, 1.7));

      // 6 -> 7
      paths.push(
        <motion.path
          key="path-6-7"
          d={`M ${coords[6].left} ${coords[6].centerY} L ${coords[7].right + 8} ${coords[7].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[5].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 2.1 }}
        />
      );
      paths.push(drawArrowhead(coords[7].right + 8, coords[7].centerY, "left", steps[6].accentColor, 2.1));

      // 7 -> 8
      paths.push(
        <motion.path
          key="path-7-8"
          d={`M ${coords[7].left} ${coords[7].centerY} L ${coords[8].right + 8} ${coords[8].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[6].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 2.5 }}
        />
      );
      paths.push(drawArrowhead(coords[8].right + 8, coords[8].centerY, "left", steps[7].accentColor, 2.5));

    } else {
      // Tablet layout (2 columns)
      const dy = 20; // vertical curvature

      // 1 -> 2
      paths.push(
        <motion.path
          key="path-1-2"
          d={`M ${coords[1].right} ${coords[1].centerY} L ${coords[2].left - 8} ${coords[2].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[0].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 0.1 }}
        />
      );
      paths.push(drawArrowhead(coords[2].left - 8, coords[2].centerY, "right", steps[1].accentColor, 0.1));

      // 2 -> 3 (vertical S-curve down-left)
      paths.push(
        <motion.path
          key="path-2-3"
          d={`M ${coords[2].centerX} ${coords[2].bottom} C ${coords[2].centerX} ${coords[2].bottom + dy}, ${coords[3].centerX} ${coords[3].top - 12 - dy}, ${coords[3].centerX} ${coords[3].top - 12}`}
          className="flowchart-svg-path"
          stroke={steps[1].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.5 }}
        />
      );
      paths.push(drawArrowhead(coords[3].centerX, coords[3].top - 12, "down", steps[2].accentColor, 0.5));

      // 3 -> 4
      paths.push(
        <motion.path
          key="path-3-4"
          d={`M ${coords[3].right} ${coords[3].centerY} L ${coords[4].left - 8} ${coords[4].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[2].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 1.0 }}
        />
      );
      paths.push(drawArrowhead(coords[4].left - 8, coords[4].centerY, "right", steps[3].accentColor, 1.0));

      // 4 -> 5 (vertical S-curve down-left)
      paths.push(
        <motion.path
          key="path-4-5"
          d={`M ${coords[4].centerX} ${coords[4].bottom} C ${coords[4].centerX} ${coords[4].bottom + dy}, ${coords[5].centerX} ${coords[5].top - 12 - dy}, ${coords[5].centerX} ${coords[5].top - 12}`}
          className="flowchart-svg-path"
          stroke={steps[3].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 1.4 }}
        />
      );
      paths.push(drawArrowhead(coords[5].centerX, coords[5].top - 12, "down", steps[4].accentColor, 1.4));

      // 5 -> 6
      paths.push(
        <motion.path
          key="path-5-6"
          d={`M ${coords[5].right} ${coords[5].centerY} L ${coords[6].left - 8} ${coords[6].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[4].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 1.9 }}
        />
      );
      paths.push(drawArrowhead(coords[6].left - 8, coords[6].centerY, "right", steps[5].accentColor, 1.9));

      // 6 -> 7 (vertical S-curve down-left)
      paths.push(
        <motion.path
          key="path-6-7"
          d={`M ${coords[6].centerX} ${coords[6].bottom} C ${coords[6].centerX} ${coords[6].bottom + dy}, ${coords[7].centerX} ${coords[7].top - 12 - dy}, ${coords[7].centerX} ${coords[7].top - 12}`}
          className="flowchart-svg-path"
          stroke={steps[5].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 2.3 }}
        />
      );
      paths.push(drawArrowhead(coords[7].centerX, coords[7].top - 12, "down", steps[6].accentColor, 2.3));

      // 7 -> 8
      paths.push(
        <motion.path
          key="path-7-8"
          d={`M ${coords[7].right} ${coords[7].centerY} L ${coords[8].left - 8} ${coords[8].centerY}`}
          className="flowchart-svg-path"
          stroke={steps[6].accentColor}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 2.8 }}
        />
      );
      paths.push(drawArrowhead(coords[8].left - 8, coords[8].centerY, "right", steps[7].accentColor, 2.8));
    }

    return paths;
  };

  return (
    <section className="flowchart-section">
      <div className="fj-container">
        {/* Header Section */}
        <div className="flowchart-header">
          <Reveal as="span" className="flowchart-badge" direction="down" distance={18} duration={0.6}>
            🇦🇺 Australia’s Job Placement Partner
          </Reveal>
          <Reveal direction="up" distance={24} duration={0.7}>
            <h2 className="flowchart-title">
              Our Proven Process to{" "}
              <span className="heading-mark">Get You Hired</span> in
              Australia
            </h2>
          </Reveal>
          <Reveal direction="up" distance={18} duration={0.7} delay={0.1}>
            <p className="flowchart-subtitle">
              We handle everything.{" "}
              <span className="flowchart-subtitle-focus">You focus</span> on{" "}
              <span className="flowchart-subtitle-future">your future</span>.
            </p>
          </Reveal>
        </div>

        {/* Process Flowchart Grid */}
        <StaggerContainer id="flowchart-container" className="flowchart-grid" stagger={0.08} delayChildren={0.15}>
          {/* SVG Connection Lines Overlay */}
          <svg
            className="flowchart-svg-overlay"
            style={{ opacity: coords ? 1 : 0, transition: "opacity 0.4s" }}
            aria-hidden="true"
          >
            {renderPaths()}
          </svg>

          {/* Cards Mapping */}
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <StaggerItem
                key={step.number}
                ref={(el) => (cardRefs.current[index] = el)}
                as="div"
                className={`flowchart-card step-${index + 1}`}
                style={{
                  "--accent-color": step.accentColor,
                  "--accent-light": step.accentLight,
                  "--accent-border": step.accentBorder,
                }}
              >
                {/* Step Number Badge */}
                <div className="step-number-badge">
                  {step.number}
                </div>

                {/* Icon Container */}
                <div className="card-icon-container">
                  <IconComponent size={26} />
                </div>

                {/* Card Content */}
                <h3 className="card-title">{step.title}</h3>
                <p className="card-text">{step.text}</p>

                {/* Conditional Badges */}
                {step.badge && (
                  <div className="card-badge">
                    <span>{step.badge}</span>
                  </div>
                )}

                {/* Mobile Spacers with down arrows (nested inside the card so it doesn't break CSS Grid) */}
                {index < 7 && (
                  <div className="mobile-arrow-container">
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.15,
                      }}
                    >
                      <ArrowDown size={20} style={{ color: step.accentColor }} />
                    </motion.div>
                  </div>
                )}
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Bottom Statistics Bar */}
        <div className="stats-bar-wrapper">
          <StaggerContainer
            as="div"
            className="stats-bar"
            stagger={0.08}
            delayChildren={0.25}
          >
            {stats.map((stat, index) => {
              const StatIcon = stat.icon;
              return (
                <StaggerItem
                  key={stat.label}
                  as="div"
                  className="stats-item"
                  style={{
                    "--stat-color": stat.color,
                    "--stat-light": stat.lightColor,
                  }}
                >
                  <div className="stats-icon-container">
                    <StatIcon size={20} />
                  </div>
                  <div className="stats-info">
                    {stat.numberValue !== undefined ? (
                      <AnimatedCounter
                        value={stat.numberValue}
                        suffix={stat.numberSuffix || ""}
                        className="stats-number"
                      />
                    ) : (
                      <span className="stats-number">{stat.number}</span>
                    )}
                    <span className="stats-label">
                      {stat.isTextLabel ? (
                        <>
                          Proven Results / <span className="stats-label-bold">Real Success Stories</span>
                        </>
                      ) : (
                        stat.label
                      )}
                    </span>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
