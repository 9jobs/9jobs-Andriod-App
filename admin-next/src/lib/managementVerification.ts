import type { useSignIn } from "@clerk/clerk-react";
export type ManagementSignIn = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;
type Factor = { strategy: string; emailAddressId?: string; phoneNumberId?: string; safeIdentifier?: string };
export type LoginAttempt = { status: string | null; createdSessionId?: string | null; supportedFirstFactors?: Factor[] | null; supportedSecondFactors?: Factor[] | null };
export type LoginChallenge = { level: "first" | "second"; strategy: "email_code" | "phone_code" | "totp" | "backup_code"; emailAddressId?: string; phoneNumberId?: string; destination?: string };

export async function prepareManagementChallenge(signIn: ManagementSignIn, challenge: LoginChallenge) {
  if (challenge.strategy === "totp" || challenge.strategy === "backup_code") return;
  if (challenge.level === "second") {
    if (challenge.strategy === "email_code") await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: challenge.emailAddressId });
    else await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: challenge.phoneNumberId });
  } else if (challenge.strategy === "email_code" && challenge.emailAddressId) {
    await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: challenge.emailAddressId });
  } else if (challenge.strategy === "phone_code" && challenge.phoneNumberId) {
    await signIn.prepareFirstFactor({ strategy: "phone_code", phoneNumberId: challenge.phoneNumberId });
  } else throw Error("Clerk did not provide a verification destination. Start sign in again.");
}

export async function beginManagementVerification(signIn: ManagementSignIn, attempt: LoginAttempt): Promise<LoginChallenge> {
  const second = ["needs_second_factor", "needs_client_trust"].includes(attempt.status || "");
  if (!second && attempt.status !== "needs_first_factor") throw Error("Clerk requires another account step. Start sign in again or use your Clerk account portal.");
  const factors = (second ? attempt.supportedSecondFactors : attempt.supportedFirstFactors) || [];
  const supported = second ? ["email_code", "phone_code", "totp", "backup_code"] : ["email_code", "phone_code"];
  const factor = supported.map(strategy => factors.find(factor => factor.strategy === strategy)).find(Boolean);
  if (!factor) throw Error("Your account requires a verification method this form cannot display. Use your configured Clerk sign-in method.");
  const challenge: LoginChallenge = { level: second ? "second" : "first", strategy: factor.strategy as LoginChallenge["strategy"], emailAddressId: factor.emailAddressId, phoneNumberId: factor.phoneNumberId, destination: factor.safeIdentifier };
  await prepareManagementChallenge(signIn, challenge);
  return challenge;
}

export async function verifyManagementChallenge(signIn: ManagementSignIn, challenge: LoginChallenge, code: string) {
  if (!code.trim()) throw Error("Enter your verification code.");
  if (challenge.level === "second") return signIn.attemptSecondFactor({ strategy: challenge.strategy, code: code.trim() });
  if (challenge.strategy !== "email_code" && challenge.strategy !== "phone_code") throw Error("Unsupported first factor.");
  return signIn.attemptFirstFactor({ strategy: challenge.strategy, code: code.trim() });
}
