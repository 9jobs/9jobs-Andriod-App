import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailPass) {
      throw new Error("GMAIL_PASS is not defined.");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "9jobsapplicationservice@gmail.com",
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: '"9Jobs Newsletter" <9jobsapplicationservice@gmail.com>',
      to: "9jobsapplicationservice@gmail.com",
      replyTo: normalizedEmail,
      subject: `New newsletter update request from ${normalizedEmail}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #d9ff5f; padding-bottom: 10px;">New Get Updated Request</h2>
          <p><strong>Email:</strong> <a href="mailto:${normalizedEmail}">${normalizedEmail}</a></p>
          <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">This request was sent via the 9Jobs footer newsletter form.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: "Thanks, we will keep you updated." }, { status: 200 });
  } catch (error) {
    console.error("Newsletter Error:", error);
    return NextResponse.json({ error: "Failed to submit email. Please try again." }, { status: 500 });
  }
}
