export const SUPPORT_EMAIL = "9jobsapplicationservice@gmail.com";
export const SUPPORT_PHONE_DISPLAY = "+61 422 279 428";
export const SUPPORT_PHONE_WHATSAPP = "61422279428";

export type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function validateContactForm(values: ContactFormValues) {
  if (!values.name.trim()) return "Please enter your name.";
  if (!/\S+@\S+\.\S+/.test(values.email.trim())) return "Please enter a valid email address.";
  if (!values.subject.trim()) return "Please enter a subject.";
  if (!values.message.trim()) return "Please enter your message.";
  return null;
}

export function buildSupportMessage(values: ContactFormValues) {
  return [
    "New 9Jobs contact request",
    "",
    `Client name: ${values.name.trim()}`,
    `Client email: ${values.email.trim()}`,
    `Subject: ${values.subject.trim()}`,
    "",
    "Message:",
    values.message.trim(),
  ].join("\n");
}

export function buildSupportEmailUrl(values: ContactFormValues) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `[9Jobs Contact] ${values.subject.trim()}`,
  )}&body=${encodeURIComponent(buildSupportMessage(values))}`;
}

export function buildSupportWhatsAppUrl(values: ContactFormValues) {
  return `https://wa.me/${SUPPORT_PHONE_WHATSAPP}?text=${encodeURIComponent(
    buildSupportMessage(values),
  )}`;
}

export async function submitContactForm(values: ContactFormValues) {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
  const response = await fetch(`${backendUrl}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Could not send your message. Please try again.",
    );
  }
  return result as { success: true; messageId: string };
}
