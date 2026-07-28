import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();
const SUPPORT_EMAIL = "9jobsapplicationservice@gmail.com";
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const requestLog = new Map<string, number[]>();

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

router.post("/contact", async (req, res) => {
  const now = Date.now();
  const requester = req.ip || req.socket.remoteAddress || "unknown";
  const recentRequests = (requestLog.get(requester) ?? []).filter(
    (timestamp) => now - timestamp < 60 * 60 * 1000,
  );
  if (recentRequests.length >= 5) {
    return res.status(429).json({ error: "Too many messages. Please try again later." });
  }

  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 254);
  const subject = clean(req.body?.subject, 160);
  const message = clean(req.body?.message, 5000);
  if (!name || !EMAIL_PATTERN.test(email) || !subject || !message) {
    return res.status(400).json({ error: "Please provide valid name, email, subject and message." });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpAppPassword = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, "");
  if (!smtpUser || !smtpAppPassword) {
    return res.status(503).json({ error: "Email delivery is temporarily unavailable." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpAppPassword },
    });
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
    const result = await transporter.sendMail({
      from: `"9Jobs Contact Form" <${smtpUser}>`,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[9Jobs Contact] ${subject}`,
      text: [
        "New 9Jobs contact request",
        "",
        `Client name: ${name}`,
        `Client email: ${email}`,
        `Subject: ${subject}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <h2>New 9Jobs contact request</h2>
        <p><strong>Client name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Client email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong><br />${safeMessage}</p>
      `,
    });

    recentRequests.push(now);
    requestLog.set(requester, recentRequests);
    return res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("[Contact] Email delivery failed:", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "Could not deliver your message. Please try again." });
  }
});

export default router;
