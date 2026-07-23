import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useClerk, useSignIn, useSignUp } from "@clerk/expo";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetCard } from "@/components/ui/BottomSheetCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TextField } from "@/components/ui/TextField";
import { colors, radii, spacing, typography } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { validateSignInPayload } from "@/features/auth/validation";

export function AuthCard() {
  const { clerkConfigured } = useSession();

  if (!clerkConfigured) {
    return <MissingClerkCard />;
  }

  return <ClerkAuthCard />;
}

function ClerkAuthCard() {
  const router = useRouter();
  const clerk = useClerk();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMode, setVerificationMode] = useState<"signup" | "signin" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const isReady = Boolean(signIn && signUp);

  const verificationLabel = useMemo(() => {
    if (verificationMode === "signin") {
      return "Enter the email code we sent to finish sign in.";
    }

    return "Enter the 6-digit code from your inbox to activate this account.";
  }, [verificationMode]);

  async function submit() {
    if (!isReady || !signIn || !signUp) {
      return;
    }

    setPending(true);
    setError(null);

    const validation = validateSignInPayload({ email, password });
    if (validation.email || validation.password) {
      setError(validation.email ?? validation.password ?? null);
      setPending(false);
      return;
    }

    try {
      if (mode === "signin") {
        console.log("Signing in with Clerk for:", email.trim());
        const signInRes = await signIn.create({
          identifier: email.trim(),
          password,
        });

        console.log("signIn.create succeeded. Status:", signInRes.status);

        if (signInRes.status === "complete" && signInRes.createdSessionId) {
          await clerk.setActive({ session: signInRes.createdSessionId });
          router.replace("/(app)");
          setPending(false);
          return;
        }

        if (signInRes.status === "needs_first_factor" || signInRes.status === "needs_second_factor") {
          setError("Your account needs one more Clerk verification step before sign-in can finish.");
          setPending(false);
          return;
        }

        setError("Clerk sign-in needs one more step. Try again in a moment.");
        setPending(false);
        return;
      }

      const generatedUsername = email.trim().split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") + Math.floor(1000 + Math.random() * 9000);
      console.log("Creating Clerk signup for:", email.trim(), "with username:", generatedUsername);
      const signUpRes = await signUp.password({
        emailAddress: email.trim(),
        password,
        username: generatedUsername,
      });

      if (signUpRes.error) {
        console.error("signUp.password failed:", signUpRes.error);
        setError(getClerkErrorMessage(signUpRes.error));
        setPending(false);
        return;
      }

      console.log("Sending email code...");
      const sendRes = await signUp.verifications.sendEmailCode();
      if (sendRes.error) {
        console.error("sendEmailCode failed:", sendRes.error);
        setError(getClerkErrorMessage(sendRes.error));
        setPending(false);
        return;
      }

      console.log("Signup password and email code sent successfully.");
      setVerificationMode("signup");
    } catch (authError) {
      console.error("Auth action failed with exception:", authError);
      setError(getClerkErrorMessage(authError));
    }

    setPending(false);
  }

  async function verifyCode() {
    if (!isReady || !signIn || !signUp) {
      return;
    }

    setPending(true);
    setError(null);
    console.log("Verifying code:", verificationCode.trim());

    try {
      if (verificationMode === "signin") {
        const verifyRes = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyRes.error) {
          console.error("signIn.mfa.verifyEmailCode failed:", verifyRes.error);
          setError(getClerkErrorMessage(verifyRes.error));
          setPending(false);
          return;
        }

        if (signIn.status === "complete") {
          const finalizeRes = await signIn.finalize({
            navigate: () => {
              router.replace("/(app)");
            },
          });
          if (finalizeRes.error) {
            console.error("finalize failed:", finalizeRes.error);
            setError(getClerkErrorMessage(finalizeRes.error));
          }
        }
      } else {
        const verifyRes = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyRes.error) {
          console.error("signUp.verifications.verifyEmailCode failed:", verifyRes.error);
          setError(getClerkErrorMessage(verifyRes.error));
          setPending(false);
          return;
        }

        if (signUp.status === "complete") {
          const finalizeRes = await signUp.finalize({
            navigate: () => {
              router.replace("/(app)");
            },
          });
          if (finalizeRes.error) {
            console.error("finalize failed:", finalizeRes.error);
            setError(getClerkErrorMessage(finalizeRes.error));
          }
        }
      }
    } catch (verificationError) {
      console.error("Verification failed with exception:", verificationError);
      setError(getClerkErrorMessage(verificationError));
    }

    setPending(false);
  }

  return (
    <BottomSheetCard>
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => {
            setMode("signin");
            setVerificationMode(null);
            setError(null);
          }}
          style={[styles.tabButton, mode === "signin" && styles.activeTabButton]}
        >
          <Text style={[styles.tab, mode === "signin" && styles.activeTab]}>Login</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode("signup");
            setVerificationMode(null);
            setError(null);
          }}
          style={[styles.tabButton, mode === "signup" && styles.activeTabButton]}
        >
          <Text style={[styles.tab, mode === "signup" && styles.activeTab]}>Signup</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>
        {verificationMode
          ? "Verify your email"
          : mode === "signin"
            ? "Welcome back to 9Jobs"
            : "Create your premium account"}
      </Text>
      <Text style={styles.body}>
        {verificationMode
          ? verificationLabel
          : mode === "signin"
            ? "Access saved roles, tracker status, and your next smart application move."
            : "Use Clerk email auth for a real sign-up flow that still runs locally in Expo."}
      </Text>
      {mode === "signup" && !verificationMode ? (
        <TextField
          label="Full name (optional)"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ayesha Khan"
        />
      ) : null}
      {!verificationMode ? (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="candidate@9jobs.app"
        />
      ) : (
        <TextField
          label="Verification code"
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="123456"
        />
      )}
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="........"
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={
          pending
            ? "Working..."
            : verificationMode
              ? "Verify code"
              : mode === "signin"
                ? "Sign in"
                : "Create account"
        }
        onPress={verificationMode ? verifyCode : submit}
        disabled={pending || !isReady}
      />
      {verificationMode ? (
        <PrimaryButton
          label="Use another email"
          onPress={() => {
            setVerificationMode(null);
            setVerificationCode("");
            setError(null);
          }}
          variant="ghost"
        />
      ) : null}
      {!isReady || pending ? <ActivityIndicator color={colors.text} /> : null}
    </BottomSheetCard>
  );
}

function MissingClerkCard() {
  const router = useRouter();
  const { signInDemo } = useSession();

  return (
    <BottomSheetCard style={styles.missingCard}>
      <Text style={styles.title}>Demo access is ready</Text>
      <Text style={styles.body}>
        Use the premium demo flow right now, or add your Clerk publishable key later for live auth.
      </Text>
      <PrimaryButton
        label="Enter demo app"
        onPress={async () => {
          await signInDemo();
          router.replace("/(app)");
        }}
      />
      <PrimaryButton
        label="Open all pages"
        onPress={async () => {
          await signInDemo();
          router.replace("/(app)/screens");
        }}
        variant="ghost"
      />
      <View style={styles.tipBox}>
        <Text style={styles.tipLabel}>Local setup</Text>
        <Text style={styles.tipText}>1. Copy `mobile/.env.example` to `mobile/.env`</Text>
        <Text style={styles.tipText}>
          2. Paste your Clerk publishable key from the Clerk dashboard
        </Text>
        <Text style={styles.tipText}>3. Run `npx expo start` again</Text>
      </View>
    </BottomSheetCard>
  );
}

function getClerkErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray(error.errors) &&
    error.errors.length > 0
  ) {
    const [firstError] = error.errors as Array<{
      longMessage?: string;
      message?: string;
      code?: string;
    }>;

    return firstError.longMessage ?? firstError.message ?? firstError.code ?? "Auth failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Auth failed. Check Clerk configuration and try again.";
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radii.pill,
    padding: 4,
    alignSelf: "flex-start",
  },
  tabButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabButton: {
    backgroundColor: colors.accent,
  },
  tab: {
    ...typography.title,
    color: colors.mutedText,
    fontSize: 16,
  },
  activeTab: {
    color: colors.text,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    marginTop: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.mutedText,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.label,
    color: "#DC2626",
  },
  missingCard: {
    gap: spacing.md,
  },
  tipBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tipLabel: {
    ...typography.label,
    color: colors.text,
  },
  tipText: {
    ...typography.body,
    color: colors.mutedText,
  },
});
