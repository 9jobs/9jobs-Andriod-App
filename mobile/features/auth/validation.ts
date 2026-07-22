import type { SignInPayload } from "@/types/auth";
import type { SignUpPayload } from "@/types/auth";

const previewFallbackPassword = "Akash@#1234";
const previewFallbackEmails = new Set([
  "preview-user-9jobs@9jobs.app",
]);

export function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export function validatePassword(password: string) {
  return password.trim().length >= 6;
}

export function validatePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 10;
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

export function validateSignUpPayload(payload: SignUpPayload) {
  const errors: Partial<Record<keyof SignUpPayload, string>> = {};

  if (!payload.firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!payload.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!validateEmail(payload.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!validatePhoneNumber(payload.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number";
  }

  if (!validatePassword(payload.password)) {
    errors.password = "Password must be at least 6 characters";
  }

  if (payload.confirmPassword.trim() !== payload.password.trim()) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function canUsePreviewFallback(email: string, password: string) {
  return (
    previewFallbackEmails.has(email.trim().toLowerCase()) &&
    password === previewFallbackPassword
  );
}
