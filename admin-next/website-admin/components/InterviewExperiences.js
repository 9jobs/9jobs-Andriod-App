"use client";

import { Quote, Star } from "lucide-react";
import { useState, useEffect } from "react";

const defaultExperiences = [
  {
    name: "Marcus Aurelius",
    role: "Engineering Manager",
    quote: "The candidates from 9Jobs were technically solid and very well prepared for the system design rounds.",
    rating: 5
  },
  {
    name: "Sarah Jenkins",
    role: "HR Director",
    quote: "Great hiring speed! The communication between 9Jobs recruiters and our team made shortlisting candidates seamless.",
    rating: 5
  },
  {
    name: "Kenji Sato",
    role: "CTO",
    quote: "Strong professionalism and high-impact skills. We found a great Senior React Engineer within two weeks.",
    rating: 5
  }
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

export default function InterviewExperiences() {
  const [dbExperiences, setDbExperiences] = useState([]);

  useEffect(() => {
    async function loadExperiences() {
      try {
        const res = await fetch("/admin/website-admin/api/interview-feedback");
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            const mapped = result.data.map(item => ({
              name: item.interviewer_name,
              role: item.job_role,
              quote: item.experience_message,
              rating: item.overall_rating
            }));
            setDbExperiences(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load interview experiences:", err);
      }
    }
    loadExperiences();
  }, []);

  const listToUse = dbExperiences.length > 0 ? dbExperiences : defaultExperiences;

  // Make sure we have at least 6 items in the list for smooth marquee scrolling without layout gaps
  let filledList = [...listToUse];
  while (filledList.length > 0 && filledList.length < 6) {
    filledList = [...filledList, ...listToUse];
  }

  const duplicatedExperiences = [...filledList, ...filledList];

  return (
    <section className="fj-section" style={{ overflow: "hidden", background: "var(--surface-muted)", borderTop: "1px solid var(--fj-line)" }}>
      <div className="fj-container">
        <div className="fj-section-head" style={{ textAlign: "center", marginBottom: "64px" }}>
          <span className="fj-label" style={{ display: "block", marginBottom: "16px", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px", color: "var(--fj-muted)" }}>Interview Experiences</span>
          <h2 style={{ fontSize: "clamp(1rem, 3vw, 1.8rem)", fontWeight: 800, margin: 0, color: "var(--fj-ink)" }}>
            What hiring managers are <span className="heading-mark">saying.</span>
          </h2>
        </div>
        
        <div className="marquee-wrapper">
          <div className="marquee-track">
            {duplicatedExperiences.map((experience, idx) => (
              <article className="fj-feature-card" key={`${experience.name}-${idx}`} style={{ width: "var(--card-width, 400px)", flexShrink: 0, padding: "32px", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid var(--fj-line)" }}>
                <div style={{ marginBottom: "24px" }}>
                  <Quote size={32} color="var(--fj-line)" strokeWidth={1.5} style={{ fill: "var(--fj-soft)", marginBottom: "16px" }} />
                  <p style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--fj-muted)", lineHeight: 1.7, margin: 0, textAlign: "left" }}>
                    {experience.quote}
                  </p>
                </div>
                
                <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid var(--fj-line)", display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="fj-experience-avatar" aria-hidden="true">{getInitials(experience.name)}</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.95rem", color: "var(--fj-ink)", fontWeight: 700 }}>{experience.name}</strong>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: experience.rating || 5 }).map((_, i) => (
                           <Star key={i} size={14} style={{ color: "#fbbf24", fill: "#fbbf24" }} />
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "var(--fj-muted)" }}>{experience.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <style>{`
          .marquee-wrapper {
            width: 100%;
            overflow: hidden;
            position: relative;
            padding: 10px 0;
          }
          .marquee-wrapper::before,
          .marquee-wrapper::after {
            content: "";
            position: absolute;
            top: 0;
            width: 150px;
            height: 100%;
            z-index: 2;
            pointer-events: none;
          }
          .marquee-wrapper::before {
            left: 0;
            background: linear-gradient(to right, var(--background), transparent);
          }
          .marquee-wrapper::after {
            right: 0;
            background: linear-gradient(to left, var(--background), transparent);
          }
          .marquee-track {
            display: flex;
            gap: var(--marquee-gap, 32px);
            width: max-content;
            animation: marquee 25s linear infinite;
            --card-width: 400px;
            --marquee-gap: 32px;
          }
          @media (max-width: 480px) {
            .marquee-track {
              --card-width: 290px;
              --marquee-gap: 16px;
            }
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
          .fj-experience-avatar {
            display: inline-flex;
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--fj-line);
            border-radius: 50%;
            background: linear-gradient(135deg, #f7faf9, #e2f8ff);
            color: var(--fj-ink);
            font-size: 0.86rem;
            font-weight: 800;
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-50% - (var(--marquee-gap) / 2))); }
          }
        `}</style>
      </div>
    </section>
  );
}
