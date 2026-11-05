import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSignIn } from "@clerk/expo";
import { TextField } from "@/components/ui/TextField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, spacing } from "@/theme";
import { validateEmail } from "./validation";

type Phase = "email" | "code" | "password" | "complete";

export function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function perform(operation: () => Promise<void>) {
    if (pending || !signIn) return;
    setPending(true);
    setError("");
    try { await operation(); }
    catch (failure: any) {
      setError(failure?.errors?.[0]?.longMessage || failure?.errors?.[0]?.message || failure?.message || "Password reset failed. Please try again.");
    } finally { setPending(false); }
  }

  async function sendCode() {
    await perform(async () => {
      const identifier = email.replace(/%40/gi, "@").trim().toLowerCase();
      if (!validateEmail(identifier)) throw new Error("Enter a valid email address");
      const created = await signIn.create({ identifier });
      if (created.error) throw created.error;
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) throw sent.error;
      setEmail(identifier);
      setCode("");
      setPhase("code");
    });
  }

  async function verifyCode() {
    await perform(async () => {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (result.error) throw result.error;
      if (signIn.status !== "needs_new_password") throw new Error("Please verify your reset code before choosing a new password.");
      setCode("");
      setPhase("password");
    });
  }

  async function resetPassword() {
    await perform(async () => {
      if (!password) throw new Error("Enter a new password");
      if (password !== confirmation) throw new Error("Passwords do not match");
      const result = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmation("");
      setPhase("complete");
    });
  }

  return <View style={styles.form}>
    {phase === "email" && <>
      <TextField label="Email address" value={email} onChangeText={setEmail} placeholder="Your registered email" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <PrimaryButton label={pending ? "Sending code..." : "Send reset code"} onPress={sendCode} disabled={pending || !signIn} />
    </>}
    {phase === "code" && <>
      <Text style={styles.message}>Enter the password reset code sent to {email}.</Text>
      <TextField label="Reset code" value={code} onChangeText={setCode} placeholder="Enter email code" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" />
      <PrimaryButton label={pending ? "Verifying..." : "Verify code"} onPress={verifyCode} disabled={pending || !code.trim()} />
      <Pressable accessibilityRole="button" disabled={pending} onPress={() => void perform(async () => { const result = await signIn.resetPasswordEmailCode.sendCode(); if (result.error) throw result.error; setCode(""); })}><Text style={styles.link}>Resend code</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={pending} onPress={() => { setCode(""); setError(""); setPhase("email"); }}><Text style={styles.link}>Use another email</Text></Pressable>
    </>}
    {phase === "password" && <>
      <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <TextField label="Confirm new password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <PrimaryButton label={pending ? "Updating password..." : "Reset password"} onPress={resetPassword} disabled={pending || !password || !confirmation} />
    </>}
    {phase === "complete" && <Text accessibilityRole="alert" style={styles.message}>Password updated successfully. Sign in with your new password and complete any account verification.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label="Back to sign in" onPress={onBack} disabled={pending} variant="ghost" />
  </View>;
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  message: { color: colors.mutedText, lineHeight: 22 },
  error: { color: "#dc2626", lineHeight: 20 },
  link: { color: colors.accentDark, fontWeight: "600", textAlign: "right", paddingVertical: spacing.sm },
});
