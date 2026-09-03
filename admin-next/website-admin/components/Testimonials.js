"use client";

import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Marquee, Reveal, StaggerContainer, StaggerItem } from "./homepage/HomeMotion";

const defaultTestimonials = [
  {
    name: "Nafisa",
    role: "Verified Client",
    quote: "Great experience with 9Jobs. The team is professional, responsive, and truly supportive. I highly recommend their services",
    rating: 4,
  },
  {
    name: "Lachlan",
    role: "Verified Client",
    quote: "Honestly, the job application automation saved me so much time. I was struggling to find hours to apply while working full-time, but their team handled it seamlessly. Ended up getting three interview calls in two weeks.",
    rating: 5,
  },
  {
    name: "Sarah",
    role: "Verified Client",
    quote: "My resume was completely overhauled to meet Australian ATS standards. The writers knew exactly what local recruiters look for. I saw a noticeable increase in responses from employers almost immediately after updating it.",
    rating: 5,
  },
  {
    name: "Oliver",
    role: "Verified Client",
    quote: "Highly recommend their LinkedIn and Seek profile optimization services. They polished my profiles, added the right keywords, and made them look incredibly professional. I've had multiple recruiters reach out to me directly.",
    rating: 5,
  },
  {
    name: "Amelia",
    role: "Verified Client",
    quote: "The interview coaching was a game-changer for me. The mock sessions gave me the confidence I needed to handle tough questions and present my experience effectively. Secured a great role last month.",
    rating: 5,
  },
];

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TestimonialCard({ testimonial }) {
  return (
    <motion.article
      className="fj-feature-card fj-testimonial-card"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.08}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "var(--card-width, 400px)",
        flexShrink: 0,
        padding: "32px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: "24px", position: "relative" }}>
        <div className="fj-quote-wrapper">
          <Quote size={18} strokeWidth={2.5} />
        </div>
        <p className="fj-testimonial-quote-text">
          {testimonial.quote}
        </p>
      </div>

      <div className="fj-testimonial-user-row">
        <span className="fj-testimonial-avatar" aria-hidden="true">
          {getInitials(testimonial.name)}
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--fj-ink)", fontWeight: 700 }}>{testimonial.name}</strong>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: testimonial.rating || 5 }).map((_, index) => (
                <Star key={index} size={14} style={{ color: "#fbbf24", fill: "#fbbf24" }} />
              ))}
            </div>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--fj-muted)" }}>{testimonial.role}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function Testimonials() {
  const listToUse = [...defaultTestimonials];
  let filledList = [...listToUse];
  while (filledList.length > 0 && filledList.length < 6) {
    filledList = [...filledList, ...listToUse];
  }

  return (
    <section className="fj-section fj-home-section--grid" style={{ overflow: "hidden" }}>
      <div className="fj-container">
        <Reveal as="div" direction="up" distance={28}>
          <div className="fj-section-head" style={{ textAlign: "center", marginBottom: "64px" }}>
            <span className="fj-label" style={{ display: "block", marginBottom: "16px" }}>
              Testimonials
            </span>
            <h2 style={{ fontSize: "clamp(1rem, 3vw, 1.8rem)", fontWeight: 800, margin: 0, color: "var(--fj-ink)" }}>
              What people are <span className="heading-mark">saying.</span>
            </h2>
          </div>
        </Reveal>

        {/* Desktop gets a premium marquee; mobile falls back to scroll-snap cards. */}
        <div className="fj-testimonial-marquee">
          <Marquee className="fj-home-marquee-shell" itemClassName="fj-testimonial-marquee__item" speed="30s" mobileStatic>
            {filledList.map((testimonial) => (
              <TestimonialCard key={`desktop-${testimonial.name}-${testimonial.quote.slice(0, 18)}`} testimonial={testimonial} />
            ))}
          </Marquee>
        </div>

        <StaggerContainer as="div" className="fj-testimonial-scrollsnap" stagger={0.12} delayChildren={0.06}>
          {listToUse.map((testimonial) => (
            <StaggerItem as="div" key={`mobile-${testimonial.name}`}>
              <TestimonialCard testimonial={testimonial} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
