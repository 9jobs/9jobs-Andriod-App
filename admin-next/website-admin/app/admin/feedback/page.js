"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare, AlertCircle, Clock, Check, UsersRound, Star, Target, ShieldCheck } from "lucide-react";

const statsData = [
  { label: "Interview Feedback", value: "142", icon: MessageSquare, color: "var(--lime)" },
  { label: "Pending Requests", value: "18", icon: Clock, color: "var(--peach)" },
  { label: "Avg Satisfaction", value: "4.8", icon: Star, color: "var(--lime)" },
  { label: "Candidate Quality", value: "4.6", icon: UsersRound, color: "var(--mint)" },
  { label: "Repeat Intent", value: "92%", icon: Target, color: "var(--lavender)" },
  { label: "Approved Testimonials", value: "34", icon: ShieldCheck, color: "var(--lime)" },
];

const mockFeedbacks = [
  { id: 1, type: "Service", client: "Acme Corp", candidate: "-", rating: 5, status: "Approved Testimonial", date: "2026-05-18", followUp: false },
  { id: 2, type: "Interview", client: "Stark Ind", candidate: "Tony Stark", rating: 4, status: "Submitted", date: "2026-05-17", followUp: false },
  { id: 3, type: "Interview", client: "Wayne Ent", candidate: "Bruce W.", rating: 2, status: "Needs Follow-up", date: "2026-05-16", followUp: true },
  { id: 4, type: "Service", client: "Daily Planet", candidate: "-", rating: 1, status: "Negative Feedback", date: "2026-05-15", followUp: true },
  { id: 5, type: "Interview", client: "LexCorp", candidate: "Clark K.", rating: "-", status: "Reminder Sent", date: "2026-05-15", followUp: false },
  { id: 6, type: "Interview", client: "Oscorp", candidate: "Peter P.", rating: "-", status: "Feedback Sent", date: "2026-05-18", followUp: false },
];

export default function AdminFeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState(mockFeedbacks);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved Testimonial":
        return <span style={{ background: "var(--lime)", color: "var(--ink)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      case "Submitted":
        return <span style={{ background: "var(--surface-strong)", color: "var(--ink)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      case "Needs Follow-up":
        return <span style={{ background: "var(--peach)", color: "var(--ink)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      case "Negative Feedback":
        return <span style={{ background: "#ffcccc", color: "#cc0000", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      case "Reminder Sent":
        return <span style={{ background: "var(--lavender)", color: "var(--ink)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      case "Feedback Sent":
        return <span style={{ background: "var(--mint)", color: "var(--ink)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>{status}</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <main className="site-main fj-page" style={{ background: "var(--surface)", minHeight: "100vh" }}>
      <section className="fj-section" style={{ paddingTop: "140px" }}>
        <div className="fj-container">
          <div className="admin-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", gap: "16px" }}>
            <h2>Feedback <span className="heading-mark">Dashboard</span></h2>
            <button className="fj-button fj-button--dark">Export CSV</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px", marginBottom: "48px" }}>
            {statsData.map((stat, idx) => (
              <div key={idx} style={{ background: "#fff", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <stat.icon size={20} />
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "600" }}>{stat.label}</span>
                </div>
                <strong style={{ fontSize: "2rem", fontWeight: "900", lineHeight: "1" }}>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
            <div className="admin-activity-flex" style={{ padding: "24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Recent Feedback Activity</h3>
              <select style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)" }}>
                <option>All Feedback</option>
                <option>Needs Follow-up</option>
                <option>Approved Testimonials</option>
              </select>
            </div>
            
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Client</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Type</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Candidate</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Rating</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Status</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Date</th>
                    <th style={{ padding: "16px 24px", fontWeight: "600", fontSize: "0.85rem", color: "var(--muted)" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "16px 24px", fontWeight: "600" }}>{fb.client}</td>
                      <td style={{ padding: "16px 24px", color: "var(--muted)" }}>{fb.type}</td>
                      <td style={{ padding: "16px 24px" }}>{fb.candidate}</td>
                      <td style={{ padding: "16px 24px", fontWeight: "bold" }}>
                        {fb.rating !== "-" ? <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>{fb.rating} <Star size={14} style={{ color: "var(--lime)", fill: "var(--lime)" }} /></span> : "-"}
                      </td>
                      <td style={{ padding: "16px 24px" }}>{getStatusBadge(fb.status)}</td>
                      <td style={{ padding: "16px 24px", color: "var(--muted)" }}>{fb.date}</td>
                      <td style={{ padding: "16px 24px" }}>
                        {fb.followUp ? (
                          <button style={{ background: "var(--ink)", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold" }}>Review</button>
                        ) : (
                          <button style={{ border: "1px solid var(--line)", background: "transparent", color: "var(--ink)", padding: "6px 12px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold" }}>View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
