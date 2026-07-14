import {
  canUsePreviewFallback,
  validateEmail,
  validatePassword,
  validateSignInPayload,
  validateSignUpPayload,
} from "@/features/auth/validation";

describe("auth validation", () => {
  test("accepts a well-formed email address", () => {
    expect(validateEmail("candidate@9jobs.app")).toBe(true);
  });

  test("rejects a short password", () => {
    expect(validatePassword("12345")).toBe(false);
  });

  test("returns field errors for invalid sign-in data", () => {
    expect(
      validateSignInPayload({
        email: "invalid",
        password: "123",
      }),
    ).toEqual({
      email: "Enter a valid email address",
      password: "Password must be at least 6 characters",
    });
  });

  test("returns field errors for invalid sign-up data", () => {
    expect(
      validateSignUpPayload({
        firstName: "",
        lastName: "",
        email: "invalid",
        phoneNumber: "1234",
        password: "123",
        confirmPassword: "456",
      }),
    ).toEqual({
      firstName: "First name is required",
      lastName: "Last name is required",
      email: "Enter a valid email address",
      phoneNumber: "Enter a valid phone number",
      password: "Password must be at least 6 characters",
      confirmPassword: "Passwords do not match",
    });
  });

  test("allows preview fallback for the shared admin test email", () => {
    expect(canUsePreviewFallback("9jobsapplicationservice@gmail.com", "Akash@#1234")).toBe(true);
  });

  test("rejects preview fallback for a wrong password", () => {
    expect(canUsePreviewFallback("9jobsapplicationservice@gmail.com", "wrong-password")).toBe(false);
  });
});
