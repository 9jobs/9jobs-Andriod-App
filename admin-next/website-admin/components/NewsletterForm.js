"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNewsletterSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/admin/website-admin/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit email.");
      }

      setEmail("");
      setStatus("Thanks, we will keep you updated.");
    } catch (error) {
      setStatus(error.message || "Unable to submit email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="fj-newsletter" onSubmit={handleNewsletterSubmit}>
        <input
          aria-label="Email address"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="fj-button fj-button--lime" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Get updated"} <ArrowRight size={16} />
        </button>
      </form>
      {status ? <p className="fj-newsletter-status">{status}</p> : null}
    </>
  );
}
