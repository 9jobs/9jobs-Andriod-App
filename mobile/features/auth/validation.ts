import type { SignInPayload } from "@/types/auth";

export function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export function validatePassword(password: string) {
  return password.trim().length >= 6;
}

export function validateSignInPayload(payload: SignInPayload) {
  const errors: Partial<Record<keyof SignInPayload, string>> = {};

  if (!validateEmail(payload.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!validatePassword(payload.password)) {
    errors.password = "Password must be at least 6 characters";
  }

  return errors;
}
