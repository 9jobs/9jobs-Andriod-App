import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase";


const JWT_SECRET = process.env.JWT_SECRET || "super-secret-9jobs-chat-key-2026";
const router = Router();

// Local credentials duplicated for runtime decoupling
const ADMIN_EMAIL = "9jobsapplicationservice@gmail.com";
const ADMIN_PASSWORD = "Akash@#1234";

async function persistAuthenticatedProfile(payload: {
  userId: string;
  email: string;
  fullName: string;
  role: "admin" | "client";
}) {
  const profileRow = {
    id: payload.userId,
    email: payload.email,
    full_name: payload.fullName,
    role: payload.role,
    account_status: "active",
    subscription_plan: payload.role === "admin" ? "internal" : "free",
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert([profileRow], { onConflict: "id" });

  if (profileError) {
    throw profileError;
  }

  if (payload.role === "admin") {
    const { error: adminError } = await supabase
      .from("admins")
      .upsert([{ email: payload.email }], { onConflict: "email" });

    if (adminError) {
      throw adminError;
    }
  }
}

router.post("/token", async (req: Request, res: Response) => {
  const { email, password, fullName, role, userId } = req.body;

  console.log(`[Auth Route] /token request: email=${email}, role=${role}`);

  if (role === "admin" || role === "staff") {
    if (userId && email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const isKnownAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();

      if (isKnownAdmin) {
        try {
          await persistAuthenticatedProfile({
            userId: String(userId),
            email: normalizedEmail,
            fullName: "9Jobs Administrator",
            role: "admin",
          });
        } catch (persistError) {
          console.warn("[Auth Route] Warning: failed to persist Clerk admin profile:", persistError);
        }

        const token = jwt.sign(
          {
            userId: String(userId),
            role: "admin",
            email: normalizedEmail,
          },
          JWT_SECRET,
          { expiresIn: "30d" }
        );

        console.log(`[Auth Route] Success: Clerk-backed admin token generated for ${normalizedEmail}`);
        return res.json({
          token,
          user: {
            userId: String(userId),
            role: "admin",
            email: normalizedEmail,
          },
        });
      }
    }

    // Admin password check
    if (
      email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      try {
        await persistAuthenticatedProfile({
          userId: "admin",
          email: ADMIN_EMAIL,
          fullName: "9Jobs Administrator",
          role: "admin",
        });
      } catch (persistError) {
        console.warn("[Auth Route] Warning: failed to persist password admin profile:", persistError);
      }

      const token = jwt.sign(
        {
          userId: "admin",
          role: "admin",
          email: ADMIN_EMAIL,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      console.log(`[Auth Route] Success: Admin token generated`);
      return res.json({ token, user: { userId: "admin", role: "admin", email: ADMIN_EMAIL } });
    }

    console.warn(`[Auth Route] Failed: Invalid admin credentials`);
    return res.status(401).json({ error: "Invalid admin credentials" });
  } else {
    // Client demo token generation (or Clerk login verification)
    const clientUserId = userId || "preview-user-9jobs";
    const clientEmail =
      email || (clientUserId === "preview-user-9jobs" ? "preview-user-9jobs@9jobs.app" : "candidate@9jobs.app");
    const clientFullName = fullName || "9Jobs Candidate";

    try {
      await persistAuthenticatedProfile({
        userId: clientUserId,
        email: clientEmail,
        fullName: clientFullName,
        role: "client",
      });
    } catch (persistError) {
      console.warn(`[Auth Route] Warning: failed to persist client profile for ${clientUserId}:`, persistError);
    }

    const token = jwt.sign(
      {
        userId: clientUserId,
        role: "client",
        email: clientEmail,
        fullName: clientFullName,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log(`[Auth Route] Success: Client token generated for ${clientUserId}`);
    return res.json({
      token,
      user: {
        userId: clientUserId,
        role: "client",
        email: clientEmail,
        fullName: clientFullName,
      },
    });
  }
});

export default router;
