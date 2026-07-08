import {
  validateEmail,
  validatePassword,
  validateSignInPayload,
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
});
