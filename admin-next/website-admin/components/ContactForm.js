"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Stagger, StaggerItem, MotionButton, Popup } from "./Motion";

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  message: "",
};

export default function ContactForm({ initialMessage = "" }) {
  const [formData, setFormData] = useState(() => ({
    ...emptyForm,
    message: initialMessage,
  }));
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/admin/website-admin/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Thank you! Your message has been sent successfully. We will get back to you shortly.",
      });
      setFormData(emptyForm);
    } catch {
      setStatus({
        type: "error",
        message: "Unable to reach the server. Please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stagger as="form" className="form-card card fj-clean-form" onSubmit={handleSubmit} aria-busy={loading}>
      <div className="fj-form-intro">
        <span>Quick response</span>
        <h2>Tell us what you need.</h2>
        <p>Share a few details and the 9Jobs team will get back with clear next steps.</p>
      </div>

      <div className="form-grid">
        <StaggerItem className="field">
          <span>First name</span>
          <input
            required
            type="text"
            placeholder="e.g. John"
            value={formData.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
          />
        </StaggerItem>
        <StaggerItem className="field">
          <span>Last name</span>
          <input
            type="text"
            placeholder="e.g. Doe"
            value={formData.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
          />
        </StaggerItem>
      </div>

      <StaggerItem className="field">
        <span>Email address</span>
        <input
          required
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
      </StaggerItem>

      <StaggerItem className="field">
        <span>Phone number</span>
        <input
          required
          type="tel"
          placeholder="+61 ..."
          value={formData.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />
      </StaggerItem>

      <StaggerItem className="field">
        <span>Message</span>
        <textarea
          required
          placeholder="How can we help?"
          value={formData.message}
          onChange={(event) => updateField("message", event.target.value)}
        />
      </StaggerItem>

      {status.message && (
        <Popup className={`status-message ${status.type}`}>
          {status.message}
        </Popup>
      )}

      <StaggerItem>
        <MotionButton
          className="btn btn-dark"
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? "Sending..." : "Send message"} <Send size={17} />
        </MotionButton>
      </StaggerItem>
    </Stagger>
  );
}
