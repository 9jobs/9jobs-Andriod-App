"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export default function ClientBillingCheckoutPanel({ token, planType, buttonLabel }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const endpoint = planType === "standard_weekly"
        ? "/admin/website-admin/api/billing/subscription-checkout"
        : "/admin/website-admin/api/billing/one-time-checkout";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      alert(error.message || "Unable to start checkout.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="fj-button fj-button--dark"
      onClick={handleCheckout}
      disabled={loading}
      style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.8 : 1 }}
    >
      {loading ? <LoaderCircle size={17} className="spin" style={{ marginRight: "8px" }} /> : <CreditCard size={17} style={{ marginRight: "8px" }} />}
      {loading ? "Redirecting..." : buttonLabel}
    </button>
  );
}
