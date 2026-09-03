"use client";

import { CreditCard } from "lucide-react";

export default function PricingCheckoutButton({ plan, className, style }) {
  const handleCheckout = async () => {
    try {
      if (plan?.action === "contact") {
        window.location.href = plan.href || "/contact";
        return;
      }

      // Use relative path in production to avoid CORS/mixed-content issues.
      // In local development, fallback to the env var or localhost:5000.
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const apiBase = isLocal ? (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "") : "";
      const endpoint = plan?.checkoutEndpoint || "/admin/website-admin/api/billing/one-time-checkout";
      
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planName: plan.name,
          token: plan.token,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Network response was not ok");
      }

      const session = await response.json();

      if (!session.url) {
        throw new Error("Stripe checkout URL was not returned");
      }

      window.location.href = session.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to initiate checkout. Please try again.");
    }
  };

  return (
    <button onClick={handleCheckout} className={className} style={style}>
      {plan?.ctaLabel || "Pay Now"} <CreditCard size={17} style={{ marginLeft: '8px' }} />
    </button>
  );
}
