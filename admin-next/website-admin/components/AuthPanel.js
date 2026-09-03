"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, UserRound } from "lucide-react";
import { fadeIn, popup } from "../utils/animations";

const copy = {
  login: {
    title: "Welcome back",
    text: "Access your 9Jobs workspace and keep your applications moving.",
    button: "Sign in",
    note: "Need an account?",
    noteLink: "Create account",
    noteHref: "/register",
  },
  register: {
    title: "Start for free",
    text: "Create a lightweight 9Jobs account placeholder for your setup.",
    button: "Create account",
    note: "Already have an account?",
    noteLink: "Sign in",
    noteHref: "/login",
  },
  forgot: {
    title: "Reset access",
    text: "Enter your email and we will help you get back in.",
    button: "Send reset link",
    note: "Remembered your password?",
    noteLink: "Back to sign in",
    noteHref: "/login",
  },
};

function markedTitle(text) {
  const index = text.lastIndexOf(" ");
  if (index === -1) return <span className="heading-mark">{text}</span>;

  return (
    <>
      {text.slice(0, index)} <span className="heading-mark">{text.slice(index + 1)}</span>
    </>
  );
}

export default function AuthPanel({ mode }) {
  const [message, setMessage] = useState("");
  const content = copy[mode];
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Account actions are ready to connect to the backend auth flow.");
  }

  return (
    <motion.div className="auth-card card" {...popup}>
      <motion.div
        className="card-media"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=900')",
        }}
        {...fadeIn}
      />
      <motion.h1 {...fadeIn}>{markedTitle(content.title)}</motion.h1>
      <motion.p className="muted" style={{ marginTop: 12 }} {...fadeIn}>
        {content.text}
      </motion.p>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <label className="field">
            <span>Name</span>
            <span style={{ position: "relative" }}>
              <UserRound
                size={18}
                style={{ position: "absolute", left: 14, top: 15, color: "var(--muted)" }}
              />
              <input required type="text" style={{ paddingLeft: 44 }} />
            </span>
          </label>
        )}

        <label className="field">
          <span>Email address</span>
          <span style={{ position: "relative" }}>
            <Mail
              size={18}
              style={{ position: "absolute", left: 14, top: 15, color: "var(--muted)" }}
            />
            <input required type="email" style={{ paddingLeft: 44 }} />
          </span>
        </label>

        {mode !== "forgot" && (
          <label className="field">
            <span>Password</span>
            <span style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{ position: "absolute", left: 14, top: 15, color: "var(--muted)" }}
              />
              <input required type="password" style={{ paddingLeft: 44 }} />
            </span>
          </label>
        )}

        {mode === "login" && (
          <div className="auth-meta">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" /> Remember me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        )}

        {message && <div className="status-message success">{message}</div>}

        <motion.button
          className="btn btn-dark"
          type="submit"
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {content.button} <ArrowRight size={17} />
        </motion.button>
      </form>

      {mode !== "forgot" && (
        <>
          <div className="divider">Or continue with</div>
          <a className="btn btn-light" href={`${apiBase}/auth/google`} style={{ width: "100%" }}>
            Google
          </a>
        </>
      )}

      <p className="auth-note">
        {content.note} <Link href={content.noteHref}>{content.noteLink}</Link>
      </p>
    </motion.div>
  );
}
