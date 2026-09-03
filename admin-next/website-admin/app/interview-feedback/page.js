"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Star } from "lucide-react";
import Link from "next/link";

export default function InterviewFeedback() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const initialFormData = {
    interviewer_name: "",
    job_role: "",
    overall_rating: 0,
    experience_message: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.interviewer_name.trim()) {
      setErrorMsg("Interviewer Name is required.");
      return;
    }

    if (!formData.job_role.trim()) {
      setErrorMsg("Job Role is required.");
      return;
    }

    if (formData.overall_rating === 0) {
      setErrorMsg("Please select an overall interview experience rating.");
      return;
    }

    if (!formData.experience_message.trim()) {
      setErrorMsg("Experience message is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/admin/website-admin/api/interview-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
        setFormData(initialFormData);
      } else {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Failed to submit feedback. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="site-main fj-page">
        <section className="fj-section" style={{ minHeight: "80vh", display: "flex", alignItems: "center" }}>
          <div className="fj-container center" style={{ maxWidth: "600px", padding: "100px 20px" }}>
            <CheckCircle2 size={64} style={{ color: "var(--lime)", margin: "0 auto 24px" }} />
            <h1 className="page-title">Thank You!</h1>
            <p className="lead">Your interview feedback has been submitted successfully. We appreciate your valuable insights.</p>
            <div style={{ marginTop: "32px" }}>
              <button onClick={() => setSubmitted(false)} className="fj-button fj-button--ghost" style={{ marginRight: "16px" }}>Submit Another</button>
              <Link href="/" className="fj-button fj-button--dark">Back to Home</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const stars = [1, 2, 3, 4, 5];

  return (
    <main className="site-main fj-page">
      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "700px" }}>
          <div className="fj-section-head center">
            <h2>Interview Experience <span className="heading-mark">Feedback</span></h2>
            <p>Please share your thoughts on the recent candidate interview.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px", background: "#fff", padding: "var(--form-padding, 40px)", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", boxShadow: "var(--soft-shadow)" }}>
            
            {errorMsg && (
              <div style={{ padding: "16px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={20} /> {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "700" }}>Interviewer Name *</label>
              <input 
                required 
                type="text" 
                name="interviewer_name" 
                placeholder="Enter your name"
                value={formData.interviewer_name} 
                onChange={handleChange} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }} 
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "700" }}>Job Role *</label>
              <input 
                required 
                type="text" 
                name="job_role" 
                placeholder="e.g. Lead Software Engineer"
                value={formData.job_role} 
                onChange={handleChange} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }} 
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "700" }}>Overall Interview Experience *</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {stars.map((star) => {
                  const isFilled = hoveredRating ? star <= hoveredRating : star <= formData.overall_rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, overall_rating: star })}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        outline: "none"
                      }}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={32}
                        style={{
                          color: isFilled ? "#fbbf24" : "var(--line)",
                          fill: isFilled ? "#fbbf24" : "transparent",
                          transition: "all 0.15s ease",
                          transform: hoveredRating === star ? "scale(1.15)" : "scale(1)"
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "700" }}>Share Your Interview Experience *</label>
              <textarea 
                required 
                name="experience_message" 
                rows="5" 
                placeholder="How was the interview process? Did the candidate meet the role requirements?"
                value={formData.experience_message} 
                onChange={handleChange} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontFamily: "inherit", resize: "vertical" }} 
              />
            </div>

            <button type="submit" disabled={loading} className="fj-button fj-button--dark" style={{ marginTop: "16px", alignSelf: "flex-start", cursor: loading ? "not-allowed" : "pointer", border: "none", fontFamily: "var(--font-heading)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Submitting..." : "Submit Feedback"} {!loading && <ArrowRight size={18} style={{ marginLeft: "8px" }} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
