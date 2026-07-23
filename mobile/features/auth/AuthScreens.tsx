import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useRef, useState } from "react";
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
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import type { SignUpPayload } from "@/types/auth";
import {
  canUsePreviewFallback,
  validateSignInPayload,
  validateSignUpPayload,
} from "@/features/auth/validation";
import { previewMobileUser } from "@/lib/data/preview-user";
import { storageKeys } from "@/lib/utils/storage";

const signUpSteps = ["Personal Info", "Career Goals", "Preferences"];

type LocalAuthProfile = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
};

function getSsoRedirectUrl() {
  return AuthSession.makeRedirectUri({
    scheme: "ninejobs",
    path: "sso-callback",
  });
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

  async function handleCreateAccount() {
    const nextErrors = validateSignUpPayload(form);
    setFieldErrors(nextErrors);
    setError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);

    try {
      await signInDemo({
        email: form.email.trim() || "candidate@9jobs.app",
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
            onChangeText={(value) => updateField(setForm, "firstName", value)}
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
            onChangeText={(value) => updateField(setForm, "lastName", value)}
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
        onChangeText={(value) => updateField(setForm, "email", value)}
        placeholder="Email address"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={fieldErrors.email}
      />
      <TextField
        label="Phone number"
        value={form.phoneNumber}
        onChangeText={(value) => updateField(setForm, "phoneNumber", value)}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={fieldErrors.phoneNumber}
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={(value) => updateField(setForm, "password", value)}
        placeholder="Password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors.password}
      />
      <TextField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={(value) => updateField(setForm, "confirmPassword", value)}
        placeholder="Confirm password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors.confirmPassword}
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
  const { signInDemo } = useSession();
  const { signUp } = useSignUp();
  const clerk = useClerk();
  const { startSSOFlow } = useSSO();
  const signUpAttemptRef = useRef<any>(null);
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

  async function persistLocalAuthProfile() {
    const profile: LocalAuthProfile = {
      email: form.email.trim(),
      password: form.password,
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
    };

    await AsyncStorage.setItem(storageKeys.mockProfile, JSON.stringify(profile));
    await signInDemo({
      id: `local-${profile.email.toLowerCase()}`,
      email: profile.email,
      fullName: profile.fullName || profile.email.split("@")[0] || "9Jobs Candidate",
      phoneNumber: profile.phoneNumber,
    });
  }

  async function handleCreateAccount() {
    const nextErrors = validateSignUpPayload(form);
    setFieldErrors(nextErrors);
    setError(null);

    if (Object.keys(nextErrors).length > 0 || !signUp) {
      return;
    }

    setPending(true);

    try {
      const signUpResource = signUp as any;
      const generatedUsername =
        form.email.trim().split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") +
        Math.floor(1000 + Math.random() * 9000);

      console.log("Starting signUp.create for:", form.email.trim(), "with username:", generatedUsername);
      const createdSignUpAttempt = await signUpResource.create({
        emailAddress: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: generatedUsername,
        unsafeMetadata: {
          phoneNumber: form.phoneNumber.trim(),
        },
      });

      const activeSignUpAttempt = createdSignUpAttempt ?? signUpResource;
      signUpAttemptRef.current = activeSignUpAttempt;
      const activeStatus = activeSignUpAttempt.status ?? null;
      const createdSessionId = activeSignUpAttempt.createdSessionId ?? null;
      const needsEmailVerification = Array.isArray(activeSignUpAttempt.unverifiedFields)
        ? activeSignUpAttempt.unverifiedFields.includes("email_address")
        : false;

      if (activeStatus === "complete" && createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      }

      console.log("Preparing signup verification. Status:", activeStatus, "Needs email verification:", needsEmailVerification);
      if (typeof signUpResource.verifications?.sendEmailCode === "function") {
        const sendRes = await signUpResource.verifications.sendEmailCode();
        if (sendRes?.error) {
          throw sendRes.error;
        }
      } else if (typeof activeSignUpAttempt.prepareEmailAddressVerification === "function") {
        await activeSignUpAttempt.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else if (typeof activeSignUpAttempt.prepareVerification === "function") {
        await activeSignUpAttempt.prepareVerification({
          strategy: "email_code",
        });
      } else if (createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        router.replace("/(app)");
        return;
      } else {
        const missing = activeSignUpAttempt.missingFields?.join(", ") || "none";
        const unverified = activeSignUpAttempt.unverifiedFields?.join(", ") || "none";
        throw new Error(`Sign up could not continue automatically. Missing: ${missing}. Unverified: ${unverified}.`);
      }

      console.log("Signup password and email code sent successfully.");
      setAwaitingVerification(true);
    } catch (authError) {
      console.error("Signup creation failed with exception:", authError);
      if (isForbiddenSignUpError(authError)) {
        await persistLocalAuthProfile();
        router.replace("/(app)");
        return;
      }
      try {
        await persistLocalAuthProfile();
        router.replace("/(app)");
        return;
      } catch (fallbackError) {
        console.error("Local signup fallback failed:", fallbackError);
      }
      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode() {
    const activeSignUpAttempt = signUpAttemptRef.current ?? signUp;
    if (!activeSignUpAttempt) {
      console.log("handleVerifyCode: no active signUp attempt found");
      return;
    }

    setPending(true);
    setError(null);
    console.log("Verifying email code:", verificationCode.trim());

    try {
      const verifyRes =
        typeof signUp?.verifications?.verifyEmailCode === "function"
          ? await signUp.verifications.verifyEmailCode({
              code: verificationCode.trim(),
            })
          : typeof activeSignUpAttempt.attemptEmailAddressVerification === "function"
          ? await activeSignUpAttempt.attemptEmailAddressVerification({
              code: verificationCode.trim(),
            })
          : typeof activeSignUpAttempt.attemptVerification === "function"
            ? await activeSignUpAttempt.attemptVerification({
                strategy: "email_code",
                code: verificationCode.trim(),
              })
            : (() => {
                throw new Error("Email code verification is not available for this sign-up flow.");
              })();

      const activeStatus =
        activeSignUpAttempt.status ??
        verifyRes.status ??
        null;

      console.log("verifyEmailCode succeeded. Status:", activeStatus);

      if (activeStatus === "complete") {
        const createdSessionId =
          verifyRes.createdSessionId ??
          activeSignUpAttempt.createdSessionId ??
          null;

        if (createdSessionId) {
          await clerk.setActive({ session: createdSessionId });
          router.replace("/(app)");
          return;
        }

        setError("Account verified, but session activation did not finish. Please sign in once.");
      } else {
        console.log("Sign up status not complete yet:", activeStatus);
        const missing = activeSignUpAttempt.missingFields?.join(", ") || "none";
        const unverified = activeSignUpAttempt.unverifiedFields?.join(", ") || "none";
        setError(`Sign up status: ${activeStatus}. Missing: ${missing}, Unverified: ${unverified}`);
      }
    } catch (verificationError) {
      console.error("Verification failed with exception:", verificationError);
      setError(getClerkErrorMessage(verificationError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: getSsoRedirectUrl(),
        unsafeMetadata: {
          phoneNumber: form.phoneNumber.trim(),
        },
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/sso-callback" as any);
        return;
      }

      setError(
        "Google sign-in needs one more Clerk step. Complete the email flow or check your Google connection setup.",
      );
    } catch (googleError) {
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
              signUpAttemptRef.current = null;
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
                onChangeText={(value) => updateField(setForm, "firstName", value)}
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
                onChangeText={(value) => updateField(setForm, "lastName", value)}
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
            onChangeText={(value) => updateField(setForm, "email", value)}
            placeholder="Email address"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          <TextField
            label="Phone number"
            value={form.phoneNumber}
            onChangeText={(value) => updateField(setForm, "phoneNumber", value)}
            placeholder="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={fieldErrors.phoneNumber}
          />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={(value) => updateField(setForm, "password", value)}
            placeholder="Password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={fieldErrors.password}
          />
          <TextField
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={(value) => updateField(setForm, "confirmPassword", value)}
            placeholder="Confirm password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={fieldErrors.confirmPassword}
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
        email: email.trim() || "candidate@9jobs.app",
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
        onChangeText={setEmail}
        placeholder="Email address"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={email.length > 0 ? fieldErrors.email : undefined}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
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
  const { signInDemo } = useSession();
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fieldErrors = useMemo(
    () => validateSignInPayload({ email, password }),
    [email, password],
  );

  async function tryPreviewFallback() {
    if (!canUsePreviewFallback(email, password)) {
      return false;
    }

    await signInDemo({
      id: previewMobileUser.id,
      email: previewMobileUser.email,
      fullName: previewMobileUser.fullName,
    });
    router.replace("/(app)");
    return true;
  }

  async function tryStoredAccountFallback() {
    const savedProfileRaw = await AsyncStorage.getItem(storageKeys.mockProfile);
    if (!savedProfileRaw) {
      return false;
    }

    const savedProfile = JSON.parse(savedProfileRaw) as LocalAuthProfile;
    const normalizedEmail = email.trim().toLowerCase();

    if (
      savedProfile.email.trim().toLowerCase() !== normalizedEmail ||
      savedProfile.password !== password
    ) {
      return false;
    }

    await signInDemo({
      id: `local-${savedProfile.email.trim().toLowerCase()}`,
      email: savedProfile.email.trim(),
      fullName: savedProfile.fullName,
      phoneNumber: savedProfile.phoneNumber,
    });
    router.replace("/(app)");
    return true;
  }

  async function handleSignIn() {
    const hasFieldErrors =
      Object.values(validateSignInPayload({ email, password })).filter(Boolean).length > 0;

    setError(null);

    if (hasFieldErrors || !signIn) {
      return;
    }

    setPending(true);

    try {
      console.log("Signing in with Clerk for:", email.trim());
      const signInRes = await signIn.create({
        identifier: email.trim(),
        password,
      });

      console.log("signIn.create succeeded. Status:", signInRes.status);

      if (signInRes.status === "complete" && signInRes.createdSessionId) {
        await clerk.setActive({ session: signInRes.createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (signInRes.status === "needs_first_factor" || signInRes.status === "needs_second_factor") {
        Alert.alert(
          "Verification required",
          "Clerk asked for an email verification step before sign-in can finish. Complete that step in Clerk, then sign in again.",
        );
        return;
      }

      setError("Your account needs one more Clerk step before sign-in can finish.");
    } catch (authError) {
      console.error("Sign in failed with exception:", authError);
      try {
        if (await tryPreviewFallback()) {
          return;
        }
        if (await tryStoredAccountFallback()) {
          return;
        }
      } catch (fallbackError) {
        console.error("Preview fallback sign-in failed:", fallbackError);
      }

      setError(getClerkErrorMessage(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: getSsoRedirectUrl(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/sso-callback" as any);
        return;
      }

      setError(
        "Google sign-in could not finish automatically. Check the Clerk Google connection and try again.",
      );
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
        onChangeText={setEmail}
        placeholder="Email address"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={email.length > 0 ? fieldErrors.email : undefined}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
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

      <View style={styles.card}>
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
      </View>
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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.googleButton,
        pressed && !disabled && styles.googleButtonPressed,
        disabled && styles.googleButtonDisabled,
      ]}
    >
      <View style={styles.googleIconWrap}>
        <GoogleIcon />
      </View>
      <Text style={styles.googleLabel}>{label}</Text>
    </Pressable>
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
    [key]: value,
  }));
}

function renderError(error: string | null) {
  if (!error) {
    return null;
  }

  return <Text style={styles.errorText}>{error}</Text>;
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

  return "Something went wrong. Please try again.";
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
