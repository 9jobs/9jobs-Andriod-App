import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Link, router } from "expo-router";
import { useClerk, useSSO, useSignIn, useSignUp } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StableEntranceView } from "@/components/motion/StableEntranceView";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import type { SignUpPayload } from "@/types/auth";
import {
  validateSignInPayload,
  validateSignUpPayload,
} from "@/features/auth/validation";
import { previewMobileUser } from "@/lib/data/preview-user";

const signUpSteps = ["Personal Info", "Career Goals", "Preferences"];

function normalizeEmailValue(value: string) {
  return value.replace(/%40/gi, "@").trim().toLowerCase();
}

function getSsoRedirectUrl() {
  return AuthSession.makeRedirectUri({
    scheme: "ninejobs",
    path: "sso-callback",
  });
}

function clerkSupportsUsername(signUp: any) {
  const configuredFields = [
    ...(Array.isArray(signUp?.requiredFields) ? signUp.requiredFields : []),
    ...(Array.isArray(signUp?.optionalFields) ? signUp.optionalFields : []),
  ];

  return configuredFields.includes("username");
}

export function SignUpScreen() {
  const { clerkConfigured } = useSession();

  if (!clerkConfigured) {
    return <DemoSignUpScreen />;
  }

  return <ClerkSignUpScreen />;
}

function DemoSignUpScreen() {
  const { signInDemo } = useSession();
  const [form, setForm] = useState<SignUpPayload>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SignUpPayload, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

  function handleFieldChange(key: keyof SignUpPayload, value: string) {
    setError(null);
    updateField(setForm, key, value);
  }

  async function handleCreateAccount() {
    const nextErrors = validateSignUpPayload(form);
    setFieldErrors(nextErrors);
    setError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!acceptedPrivacyPolicy) {
      setError("Please accept the Privacy Policy before continuing.");
      return;
    }

    setPending(true);

    try {
      await signInDemo({
        email: normalizeEmailValue(form.email) || "candidate@9jobs.app",
        fullName: `${form.firstName} ${form.lastName}`.trim() || "9Jobs Candidate",
      });
      router.replace("/(app)");
    } catch (authError) {
      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      await signInDemo({
        email: previewMobileUser.email,
        fullName: previewMobileUser.fullName,
      });
      router.replace("/(app)");
    } catch (googleError) {
      setError(getClerkErrorMessage(googleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold
      title="Create account"
      subtitle="Join 50,000+ professionals"
      showBack
      showProgress
      progressIndex={0}
      footer={
        <Text style={styles.switchText}>
          Already have an account?{" "}
          <Link href="/(public)/auth/sign-in" style={styles.switchLink}>
            Sign in
          </Link>
        </Text>
      }
    >
      <View style={styles.row}>
        <View style={styles.flexItem}>
          <TextField
            label="First name"
            value={form.firstName}
            onChangeText={(value) => handleFieldChange("firstName", value)}
            placeholder="First name"
            autoCapitalize="words"
            textContentType="givenName"
            error={fieldErrors.firstName}
          />
        </View>
        <View style={styles.flexItem}>
          <TextField
            label="Last name"
            value={form.lastName}
            onChangeText={(value) => handleFieldChange("lastName", value)}
            placeholder="Last name"
            autoCapitalize="words"
            textContentType="familyName"
            error={fieldErrors.lastName}
          />
        </View>
      </View>
      <TextField
        label="Email address"
        value={form.email}
        onChangeText={(value) => handleFieldChange("email", value)}
        placeholder="Email address"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={fieldErrors.email}
      />
      <TextField
        label="Phone number"
        value={form.phoneNumber}
        onChangeText={(value) => handleFieldChange("phoneNumber", value)}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={fieldErrors.phoneNumber}
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={(value) => handleFieldChange("password", value)}
        placeholder="Password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors.password}
      />
      <TextField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={(value) => handleFieldChange("confirmPassword", value)}
        placeholder="Confirm password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors.confirmPassword}
      />
      <PrivacyConsent
        accepted={acceptedPrivacyPolicy}
        onToggle={() => setAcceptedPrivacyPolicy((current) => !current)}
      />
      {renderError(error)}
      <PrimaryButton
        label={pending ? "Working..." : "Continue"}
        onPress={handleCreateAccount}
        disabled={pending}
        style={styles.ctaButton}
      />
      <GoogleButton
        label="Continue with Google"
        onPress={handleGoogle}
        disabled={pending}
      />
      {pending ? <ActivityIndicator color={colors.accentDark} /> : null}
      <Text style={styles.setupText}>
        Clerk publishable key missing. UI works, and the demo dashboard will still open.
      </Text>
    </AuthScaffold>
  );
}

export function SignInScreen() {
  const { clerkConfigured } = useSession();

  if (!clerkConfigured) {
    return <DemoSignInScreen />;
  }

  return <ClerkSignInScreen />;
}

function ClerkSignUpScreen() {
  const { signUp } = useSignUp();
  const clerk = useClerk();
  const { startSSOFlow } = useSSO();
  const [form, setForm] = useState<SignUpPayload>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SignUpPayload, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

  function handleFieldChange(key: keyof SignUpPayload, value: string) {
    setError(null);
    updateField(setForm, key, value);
  }

  async function handleCreateAccount() {
    const nextErrors = validateSignUpPayload(form);
    setFieldErrors(nextErrors);
    setError(null);

    if (Object.keys(nextErrors).length > 0 || !signUp) {
      return;
    }

    if (!acceptedPrivacyPolicy) {
      setError("Please accept the Privacy Policy before continuing.");
      return;
    }

    setPending(true);

    try {
      const signUpResource = signUp as any;
      const normalizedEmail = normalizeEmailValue(form.email);
      const signUpPayload: Record<string, unknown> = {
        emailAddress: normalizedEmail,
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        unsafeMetadata: {
          phoneNumber: form.phoneNumber.trim(),
        },
      };

      if (clerkSupportsUsername(signUpResource)) {
        signUpPayload.username =
          normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") +
          Math.floor(1000 + Math.random() * 9000);
      }

      const signUpResult =
        typeof signUpResource.password === "function"
          ? await signUpResource.password(signUpPayload)
          : await signUpResource.create(signUpPayload);

      if (signUpResult?.error) {
        throw signUpResult.error;
      }

      const activeStatus = signUpResource.status ?? signUpResult?.status ?? null;
      const createdSessionId =
        signUpResource.createdSessionId ?? signUpResult?.createdSessionId ?? null;

      if (activeStatus === "complete" && createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (typeof signUpResource.verifications?.sendEmailCode === "function") {
        const sendRes = await signUpResource.verifications.sendEmailCode();
        if (sendRes?.error) {
          throw sendRes.error;
        }
      } else if (typeof signUpResource.prepareEmailAddressVerification === "function") {
        await signUpResource.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else if (typeof signUpResource.prepareVerification === "function") {
        await signUpResource.prepareVerification({
          strategy: "email_code",
        });
      } else if (createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      } else {
        const missing = signUpResource.missingFields?.join(", ") || "none";
        const unverified = signUpResource.unverifiedFields?.join(", ") || "none";
        throw new Error(`Sign up could not continue automatically. Missing: ${missing}. Unverified: ${unverified}.`);
      }

      setAwaitingVerification(true);
    } catch (authError) {
      logClerkError("sign_up.create", authError, signUp as any);
      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode() {
    if (!signUp) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const verifyRes =
        typeof (signUp as any).verifications?.verifyEmailCode === "function"
          ? await (signUp as any).verifications.verifyEmailCode({
              code: verificationCode.trim(),
            })
          : typeof (signUp as any).attemptEmailAddressVerification === "function"
            ? await (signUp as any).attemptEmailAddressVerification({
                code: verificationCode.trim(),
              })
            : typeof (signUp as any).attemptVerification === "function"
            ? await (signUp as any).attemptVerification({
                strategy: "email_code",
                code: verificationCode.trim(),
              })
            : (() => {
                throw new Error("Email code verification is not available for this sign-up flow.");
              })();

      if (verifyRes?.error) {
        throw verifyRes.error;
      }

      const activeStatus = (signUp as any).status ?? verifyRes?.status ?? null;

      if (activeStatus === "complete") {
        const createdSessionId =
          (signUp as any).createdSessionId ??
          verifyRes?.createdSessionId ??
          null;

        if (createdSessionId) {
          await clerk.setActive({ session: createdSessionId });
          router.replace("/(app)");
          return;
        }

        if (typeof (signUp as any).finalize === "function") {
          const finalizeRes = await (signUp as any).finalize({
            navigate: () => {
              router.replace("/(app)");
            },
          });

          if (finalizeRes?.error) {
            throw finalizeRes.error;
          }

          return;
        }

        setError("Account verified, but session activation did not finish. Please sign in once.");
      } else {
        const missing = (signUp as any).missingFields?.join(", ") || "none";
        const unverified = (signUp as any).unverifiedFields?.join(", ") || "none";
        setError(`Sign up status: ${activeStatus}. Missing: ${missing}, Unverified: ${unverified}`);
      }
    } catch (verificationError) {
      logClerkError("sign_up.verify_email_code", verificationError, signUp as any);
      setError(getClerkErrorMessage(verificationError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      const googleResult = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: getSsoRedirectUrl(),
        unsafeMetadata: {
          phoneNumber: form.phoneNumber.trim(),
        },
      });

      const { createdSessionId, setActive, signIn, signUp: googleSignUp } = googleResult;

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      const signInStatus = signIn?.status ?? "unknown";
      const signUpStatus = googleSignUp?.status ?? "unknown";
      setError(
        `Google sign-in did not finish with an active Clerk session. Sign in status: ${signInStatus}. Sign up status: ${signUpStatus}.`,
      );
    } catch (googleError) {
      logClerkError("oauth_google.sign_up", googleError);
      setError(getClerkErrorMessage(googleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold
      title={awaitingVerification ? "Verify your email" : "Create account"}
      subtitle={
        awaitingVerification
          ? "We sent a verification code to your email. Enter it below to activate your 9Jobs account."
          : "Join 50,000+ professionals"
      }
      showBack
      showProgress={!awaitingVerification}
      progressIndex={0}
      footer={
        <Text style={styles.switchText}>
          Already have an account?{" "}
          <Link href="/(public)/auth/sign-in" style={styles.switchLink}>
            Sign in
          </Link>
        </Text>
      }
    >
      {awaitingVerification ? (
        <>
          <TextField
            label="Verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          {renderError(error)}
          <PrimaryButton
            label={pending ? "Verifying..." : "Verify and continue"}
            onPress={handleVerifyCode}
            disabled={pending || verificationCode.trim().length < 6}
            style={styles.ctaButton}
          />
          <PrimaryButton
            label="Use another email"
            onPress={() => {
              setAwaitingVerification(false);
              setVerificationCode("");
              setError(null);
            }}
            variant="ghost"
          />
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.flexItem}>
              <TextField
                label="First name"
                value={form.firstName}
                onChangeText={(value) => handleFieldChange("firstName", value)}
                placeholder="First name"
                autoCapitalize="words"
                textContentType="givenName"
                error={fieldErrors.firstName}
              />
            </View>
            <View style={styles.flexItem}>
              <TextField
                label="Last name"
                value={form.lastName}
                onChangeText={(value) => handleFieldChange("lastName", value)}
                placeholder="Last name"
                autoCapitalize="words"
                textContentType="familyName"
                error={fieldErrors.lastName}
              />
            </View>
          </View>
          <TextField
            label="Email address"
            value={form.email}
            onChangeText={(value) => handleFieldChange("email", value)}
            placeholder="Email address"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          <TextField
            label="Phone number"
            value={form.phoneNumber}
            onChangeText={(value) => handleFieldChange("phoneNumber", value)}
            placeholder="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={fieldErrors.phoneNumber}
          />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={(value) => handleFieldChange("password", value)}
            placeholder="Password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={fieldErrors.password}
          />
          <TextField
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={(value) => handleFieldChange("confirmPassword", value)}
            placeholder="Confirm password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={fieldErrors.confirmPassword}
          />
          <PrivacyConsent
            accepted={acceptedPrivacyPolicy}
            onToggle={() => setAcceptedPrivacyPolicy((current) => !current)}
          />
          {renderError(error)}
          <PrimaryButton
            label={pending ? "Working..." : "Continue"}
            onPress={handleCreateAccount}
            disabled={pending || !signUp}
            style={styles.ctaButton}
          />
          <GoogleButton
            label="Continue with Google"
            onPress={handleGoogle}
            disabled={pending || !signUp}
          />
        </>
      )}
      {pending ? <ActivityIndicator color={colors.accentDark} /> : null}
    </AuthScaffold>
  );
}

function DemoSignInScreen() {
  const { signInDemo } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fieldErrors = useMemo(
    () => validateSignInPayload({ email, password }),
    [email, password],
  );

  async function handleSignIn() {
    const hasFieldErrors =
      Object.values(validateSignInPayload({ email, password })).filter(Boolean).length > 0;

    setError(null);

    if (hasFieldErrors) {
      return;
    }

    setPending(true);

    try {
      await signInDemo({
        email: normalizeEmailValue(email) || "candidate@9jobs.app",
        fullName: "9Jobs Candidate",
      });
      router.replace("/(app)");
    } catch (authError) {
      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      await signInDemo({
        email: previewMobileUser.email,
        fullName: previewMobileUser.fullName,
      });
      router.replace("/(app)");
    } catch (googleError) {
      setError(getClerkErrorMessage(googleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold
      title="Sign in"
      subtitle="Welcome back to your career control room."
      showBack
      footer={
        <Text style={styles.switchText}>
          New to 9Jobs?{" "}
          <Link href="/(public)/auth/sign-up" style={styles.switchLink}>
            Create account
          </Link>
        </Text>
      }
    >
      <TextField
        label="Email address"
        value={email}
        onChangeText={(value) => {
          setError(null);
          setEmail(normalizeEmailValue(value));
        }}
        placeholder="Email address"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={email.length > 0 ? fieldErrors.email : undefined}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={(value) => {
          setError(null);
          setPassword(value);
        }}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        error={password.length > 0 ? fieldErrors.password : undefined}
      />
      {renderError(error)}
      <PrimaryButton
        label={pending ? "Signing in..." : "Sign in"}
        onPress={handleSignIn}
        disabled={pending}
        style={styles.ctaButton}
      />
      <GoogleButton
        label="Continue with Google"
        onPress={handleGoogle}
        disabled={pending}
      />
      {pending ? <ActivityIndicator color={colors.accentDark} /> : null}
      <Text style={styles.setupText}>
        Clerk publishable key missing. Demo session will open until Clerk is configured.
      </Text>
    </AuthScaffold>
  );
}

function ClerkSignInScreen() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fieldErrors = useMemo(
    () => validateSignInPayload({ email, password }),
    [email, password],
  );

  async function handleSignIn() {
    const hasFieldErrors =
      Object.values(validateSignInPayload({ email, password })).filter(Boolean).length > 0;

    setError(null);

    if (hasFieldErrors || !signIn) {
      return;
    }

    setPending(true);

    try {
      const signInResource = signIn as any;
      const normalizedEmail = normalizeEmailValue(email);
      const signInRes = (await signInResource.create({
        identifier: normalizedEmail,
        password,
      })) as any;

      if (signInRes?.error) {
        throw signInRes.error;
      }

      let activeResult = signInRes;
      let activeStatus = activeResult?.status ?? signInResource.status ?? null;

      const createdSessionId =
        activeResult?.createdSessionId ??
        signInResource.createdSessionId ??
        null;

      if (activeStatus === "complete" && createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (
        activeStatus === "complete" &&
        typeof signInResource.finalize === "function"
      ) {
        const finalizeRes = await signInResource.finalize({
          navigate: () => {
            router.replace("/(app)");
          },
        });

        if (finalizeRes?.error) {
          throw finalizeRes.error;
        }

        return;
      }

      if (
        (activeStatus === "needs_client_trust" ||
          activeStatus === "needs_second_factor" ||
          activeStatus === "needs_first_factor") &&
        typeof signInResource.mfa?.verifyEmailCode === "function" &&
        hasEmailCodeFactor(signInResource, activeResult)
      ) {
        if (
          activeStatus === "needs_client_trust" &&
          typeof signInResource.prepareSecondFactor === "function"
        ) {
          const prepareRes = await signInResource.prepareSecondFactor({
            strategy: "email_code",
          });

          if (prepareRes?.error) {
            throw prepareRes.error;
          }
        } else if (typeof signInResource.prepareFirstFactor === "function") {
          const prepareRes = await signInResource.prepareFirstFactor({
            strategy: "email_code",
          });

          if (prepareRes?.error) {
            throw prepareRes.error;
          }
        } else if (typeof signInResource.prepareSecondFactor === "function") {
          const prepareRes = await signInResource.prepareSecondFactor({
            strategy: "email_code",
          });

          if (prepareRes?.error) {
            throw prepareRes.error;
          }
        } else if (typeof signInResource.mfa?.sendEmailCode === "function") {
          const sendRes = await signInResource.mfa.sendEmailCode();

          if (sendRes?.error) {
            throw sendRes.error;
          }
        }

        setAwaitingVerification(true);
        return;
      }

      if (
        (activeStatus === "needs_client_trust" ||
          activeStatus === "needs_second_factor" ||
          activeStatus === "needs_first_factor") &&
        !hasEmailCodeFactor(signInResource, activeResult)
      ) {
        setError(
          activeStatus === "needs_client_trust"
            ? "This sign-in needs Clerk device trust verification, but email code is not enabled for that verification path on this Clerk instance."
            : "Clerk asked for an additional sign-in factor that is not configured as email code for this account. Password sign-in did not complete automatically.",
        );
        return;
      }

      setError(
        `Your account needs one more Clerk step before sign-in can finish. Status: ${activeStatus ?? "unknown"}.`,
      );
    } catch (authError) {
      logClerkError("sign_in.create", authError, signIn);
      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleVerifySignInCode() {
    if (!signIn) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const signInResource = signIn as any;
      const verifyRes =
        typeof signInResource.mfa?.verifyEmailCode === "function"
          ? await signInResource.mfa.verifyEmailCode({
              code: verificationCode.trim(),
            })
          : (() => {
              throw new Error("Email verification is not available for this sign-in flow.");
            })();

      if (verifyRes?.error) {
        throw verifyRes.error;
      }

      const activeStatus = signInResource.status ?? verifyRes?.status ?? null;
      const createdSessionId =
        signInResource.createdSessionId ??
        verifyRes?.createdSessionId ??
        null;

      if (activeStatus === "complete" && createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (activeStatus === "complete" && typeof signInResource.finalize === "function") {
        const finalizeRes = await signInResource.finalize({
          navigate: () => {
            router.replace("/(app)");
          },
        });

        if (finalizeRes?.error) {
          throw finalizeRes.error;
        }

        return;
      }

      setError(`Sign in status: ${activeStatus ?? "unknown"}.`);
    } catch (verificationError) {
      logClerkError("sign_in.verify_email_code", verificationError, signIn);
      setError(getClerkErrorMessage(verificationError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      const googleResult = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: getSsoRedirectUrl(),
      });

      const { createdSessionId, setActive, signIn: googleSignIn, signUp } = googleResult;

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      setError(
        `Google sign-in did not finish with an active Clerk session. Sign in status: ${googleSignIn?.status ?? "unknown"}. Sign up status: ${signUp?.status ?? "unknown"}.`,
      );
    } catch (googleError) {
      logClerkError("oauth_google.sign_in", googleError);
      setError(getClerkErrorMessage(googleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScaffold
      title={awaitingVerification ? "Verify sign in" : "Sign in"}
      subtitle={
        awaitingVerification
          ? "Enter the verification code to finish signing in."
          : "Welcome back to your career control room."
      }
      showBack
      footer={
        <Text style={styles.switchText}>
          New to 9Jobs?{" "}
          <Link href="/(public)/auth/sign-up" style={styles.switchLink}>
            Create account
          </Link>
        </Text>
      }
    >
      {awaitingVerification ? (
        <>
          <TextField
            label="Verification code"
            value={verificationCode}
            onChangeText={(value) => {
              setError(null);
              setVerificationCode(value);
            }}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          {renderError(error)}
          <PrimaryButton
            label={pending ? "Verifying..." : "Verify and continue"}
            onPress={handleVerifySignInCode}
            disabled={pending || verificationCode.trim().length < 6}
            style={styles.ctaButton}
          />
          <PrimaryButton
            label="Back to sign in"
            onPress={() => {
              setAwaitingVerification(false);
              setVerificationCode("");
              setError(null);
            }}
            variant="ghost"
          />
        </>
      ) : (
        <>
          <TextField
            label="Email address"
            value={email}
            onChangeText={(value) => {
              setError(null);
              setEmail(normalizeEmailValue(value));
            }}
            placeholder="Email address"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={email.length > 0 ? fieldErrors.email : undefined}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={(value) => {
              setError(null);
              setPassword(value);
            }}
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            error={password.length > 0 ? fieldErrors.password : undefined}
          />
          {renderError(error)}
          <PrimaryButton
            label={pending ? "Signing in..." : "Sign in"}
            onPress={handleSignIn}
            disabled={pending || !signIn}
            style={styles.ctaButton}
          />
          <GoogleButton
            label="Continue with Google"
            onPress={handleGoogle}
            disabled={pending || !signIn}
          />
        </>
      )}
      {pending ? <ActivityIndicator color={colors.accentDark} /> : null}
    </AuthScaffold>
  );
}

function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  showBack = false,
  showProgress = false,
  progressIndex = 0,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
  showProgress?: boolean;
  progressIndex?: number;
}) {
  return (
    <Screen style={styles.screen} contentStyle={styles.screenContent}>
      <View style={styles.topGlow} pointerEvents="none" />
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={() => router.replace("/splash")}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>← Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.brandLockup}>
          <BrandLogo size={118} />
          <Text style={styles.kicker}>Career elevated</Text>
        </View>
      </View>

      <StableEntranceView direction="up" duration={480} style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {showProgress ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressBars}>
              {signUpSteps.map((step, index) => (
                <View
                  key={step}
                  style={[
                    styles.progressSegment,
                    index <= progressIndex && styles.progressSegmentActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.progressLabels}>
              {signUpSteps.map((step, index) => (
                <Text
                  key={step}
                  style={[
                    styles.progressLabel,
                    index === progressIndex && styles.progressLabelActive,
                  ]}
                >
                  {step}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.form}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </StableEntranceView>
    </Screen>
  );
}

function GoogleButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      opacityTo={0.92}
      duration={120}
      style={[
        styles.googleButton,
        disabled && styles.googleButtonDisabled,
      ]}
    >
      <View style={styles.googleIconWrap}>
        <GoogleIcon />
      </View>
      <Text style={styles.googleLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.805 12.23C21.805 11.55 21.744 10.896 21.631 10.268H12V14.07H17.503C17.266 15.35 16.544 16.434 15.46 17.162V19.628H18.636C20.496 17.915 21.805 15.389 21.805 12.23Z"
        fill="#4285F4"
      />
      <Path
        d="M12 22C14.76 22 17.076 21.085 18.636 19.628L15.46 17.162C14.545 17.773 13.389 18.147 12 18.147C9.337 18.147 7.082 16.35 6.278 13.93H2.998V16.474C4.549 19.567 8.007 22 12 22Z"
        fill="#34A853"
      />
      <Path
        d="M6.278 13.93C6.074 13.319 5.957 12.665 5.957 12C5.957 11.335 6.074 10.681 6.278 10.07V7.526H2.998C2.36 8.788 2 10.224 2 12C2 13.776 2.36 15.212 2.998 16.474L6.278 13.93Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.853C13.515 5.853 14.866 6.372 15.924 7.387L18.707 4.604C17.066 3.069 14.75 2 12 2C8.007 2 4.549 4.433 2.998 7.526L6.278 10.07C7.082 7.65 9.337 5.853 12 5.853Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function updateField(
  setForm: Dispatch<SetStateAction<SignUpPayload>>,
  key: keyof SignUpPayload,
  value: string,
) {
  setForm((current) => ({
    ...current,
    [key]: key === "email" ? normalizeEmailValue(value) : value,
  }));
}

function renderError(error: string | null) {
  if (!error) {
    return null;
  }

  return <Text style={styles.errorText}>{error}</Text>;
}

function hasEmailCodeFactor(clerkState: any, result?: any) {
  const factorGroups = [
    result?.supportedFirstFactors,
    result?.supportedSecondFactors,
    result?.firstFactors,
    result?.secondFactors,
    clerkState?.supportedFirstFactors,
    clerkState?.supportedSecondFactors,
    clerkState?.firstFactors,
    clerkState?.secondFactors,
  ];

  return factorGroups.some(
    (group) =>
      Array.isArray(group) &&
      group.some((factor) => {
        const strategy = typeof factor?.strategy === "string" ? factor.strategy : "";
        return strategy === "email_code" || strategy === "email_address_code";
      }),
  );
}

function PrivacyConsent({
  accepted,
  onToggle,
}: {
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.privacyWrap}>
      <View style={styles.privacyRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={onToggle}
          style={[styles.checkbox, accepted && styles.checkboxChecked]}
        >
          {accepted ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </Pressable>
        <Text style={styles.privacyText}>
          I agree to the{" "}
          <Text
            style={styles.privacyLink}
            onPress={() => router.push("/(public)/privacy-policy")}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </View>
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
    const combinedMessage = `${firstError.longMessage ?? ""} ${firstError.message ?? ""}`.toLowerCase();

    if (
      combinedMessage.includes("compromised") ||
      combinedMessage.includes("data breach") ||
      combinedMessage.includes("haveibeenpwned")
    ) {
      return "This password was rejected by Clerk because it appears in known breach/common-password lists. Use a stronger unique password and try again.";
    }

    if (firstError.code === "factor_not_found") {
      return "Clerk could not find the requested email verification factor for this sign-in attempt. Password login should continue without forcing that extra email-code step.";
    }

    return firstError.longMessage ?? firstError.message ?? firstError.code ?? "Auth failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function logClerkError(operation: string, error: unknown, clerkState?: any) {
  if (!__DEV__) {
    return;
  }

  const stateSummary = clerkState
    ? {
        status: clerkState.status ?? null,
        missingFields: clerkState.missingFields ?? null,
        unverifiedFields: clerkState.unverifiedFields ?? null,
        createdSessionIdPresent: Boolean(clerkState.createdSessionId),
      }
    : null;

  console.error(`[Auth] ${operation} failed`, {
    error,
    stateSummary,
  });
}

function isForbiddenSignUpError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    return error.errors.some((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const code =
        "code" in entry && typeof entry.code === "string" ? entry.code.toLowerCase() : "";
      const message =
        "message" in entry && typeof entry.message === "string"
          ? entry.message.toLowerCase()
          : "";
      const longMessage =
        "longMessage" in entry && typeof entry.longMessage === "string"
          ? entry.longMessage.toLowerCase()
          : "";

      return (
        code.includes("forbidden") ||
        message.includes("sign up is forbidden") ||
        longMessage.includes("sign up is forbidden")
      );
    });
  }

  return false;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  screenContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(163, 230, 53, 0.18)",
  },
  header: {
    gap: spacing.sm,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backLabel: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  brandLockup: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  kicker: {
    ...typography.label,
    color: colors.accentDark,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 26,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
  },
  progressWrap: {
    gap: spacing.xs,
  },
  progressBars: {
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: "#E6E4DB",
  },
  progressSegmentActive: {
    backgroundColor: colors.accent,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  progressLabel: {
    ...typography.label,
    flex: 1,
    color: colors.subtleText,
    fontSize: 10,
  },
  progressLabelActive: {
    color: colors.text,
  },
  form: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  googleButtonPressed: {
    opacity: 0.92,
  },
  googleButtonDisabled: {
    opacity: 0.55,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  googleLabel: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  ctaButton: {
    minHeight: 56,
  },
  privacyWrap: {
    marginTop: spacing.xs,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxTick: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  privacyText: {
    ...typography.body,
    color: colors.mutedText,
    flex: 1,
  },
  privacyLink: {
    color: colors.text,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorText: {
    ...typography.label,
    color: "#DC2626",
  },
  footer: {
    paddingTop: spacing.xs,
    alignItems: "center",
  },
  switchText: {
    ...typography.body,
    color: colors.mutedText,
  },
  switchLink: {
    color: colors.text,
    fontWeight: "700",
  },
  setupText: {
    ...typography.label,
    color: colors.subtleText,
    textAlign: "center",
  },
});
