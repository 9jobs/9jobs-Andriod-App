import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const weeklySupportPlans = [
  {
    id: "trial",
    title: "Trial",
    description:
      "Try 9Jobs for 2 days. Day 1 includes LinkedIn and resume optimization, and Day 2 shows you our job application support services.",
    price: "$50",
    cadence: "/ 2 days",
    features: [
      "Day 1 LinkedIn optimization",
      "Day 1 resume optimization",
      "Day 2 job apply services overview",
      "2-day support window",
    ],
    accent: "light" as const,
    badge: null,
    secondaryCta: "Get a schedule",
  },
  {
    id: "non-it",
    title: "Non-IT",
    description:
      "After the trial, continue with weekly support for non-IT candidates who want structured job application help and accountability.",
    price: "$200",
    cadence: "/ week",
    features: [
      "Weekly plan for non-IT roles",
      "Application tracking",
      "Job application support",
      "Follow-up support",
      "Weekly accountability",
    ],
    accent: "light" as const,
    badge: "Popular",
    secondaryCta: "Get a schedule",
  },
  {
    id: "it",
    title: "IT",
    description:
      "After the trial, continue with weekly support for IT candidates who want premium tech-focused job application help.",
    price: "$250",
    cadence: "/ week",
    features: [
      "Weekly plan for IT roles",
      "Tech-focused application support",
      "ATS keyword targeting",
      "Interview prep support",
      "Weekly accountability",
    ],
    accent: "dark" as const,
    badge: null,
    secondaryCta: "Get a schedule",
  },
];

const optimizationPlans = [
  {
    id: "resume-makeover",
    title: "Resume Makeover",
    description:
      "Professional resume redesign tailored for ATS systems to get you noticed.",
    price: "$49",
    cadence: "/ one-time",
    features: [
      "Resume redesign (ATS-friendly)",
      "Optimized formatting & structure",
      "Grammar & wording improvements",
      "Industry-specific keyword optimization",
      "Achievement-focused content",
      "PDF delivery (ATS + Recruiter friendly)",
    ],
    accent: "dark" as const,
    badge: null,
    secondaryCta: "Get started",
  },
  {
    id: "resume-linkedin-seek",
    title: "Resume + LinkedIn + SEEK Optimisation",
    description:
      "Complete professional branding to boost your Resume, LinkedIn and SEEK profile visibility.",
    price: "$89",
    cadence: "/ one-time",
    features: [
      "Everything in Resume Makeover",
      "LinkedIn profile optimization",
      "SEEK profile optimization",
      "Headline & About section rewrite",
      "Experience & skills enhancement",
      "ATS & search keyword targeting",
      "Profile visibility improvements",
      "PDF delivery + profile guides",
    ],
    accent: "light" as const,
    badge: "Most Popular",
    secondaryCta: "Get started",
  },
];

export default function PricingScreen() {
  const params = useLocalSearchParams<{ payment_status?: string; session_id?: string }>();
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const allPlans = [...weeklySupportPlans, ...optimizationPlans];
    return Object.fromEntries(
      allPlans.map((plan) => [plan.id, plan.price.replace(/[^\d.]/g, "")]),
    );
  });

  useEffect(() => {
    if (params.payment_status !== "success" || !params.session_id || verifiedSessionId === params.session_id) {
      return;
    }

    let cancelled = false;

    async function verifySession() {
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
        const response = await fetch(`${backendUrl}/api/payments/checkout-session/${params.session_id}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof payload.error === "string" ? payload.error : "Could not verify payment.");
        }

        if (cancelled) return;

        setVerifiedSessionId(String(params.session_id));
        if (payload.session?.payment_status === "paid") {
          Alert.alert("Payment successful", "Stripe test payment was completed successfully for this plan.");
        } else {
          Alert.alert("Payment pending", "The checkout returned, but Stripe has not marked the payment as paid yet.");
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert("Verification failed", error instanceof Error ? error.message : "Could not verify payment.");
        }
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [params.payment_status, params.session_id, verifiedSessionId]);

  function updateAmount(planId: string, value: string) {
    setAmounts((current) => ({
      ...current,
      [planId]: value.replace(/[^\d.]/g, ""),
    }));
  }

  async function handlePayNow(plan: {
    id: string;
  }) {
    if (pendingPlanId) {
      return;
    }

    try {
      setPendingPlanId(plan.id);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
      const amount = amounts[plan.id] || "";
      const response = await fetch(`${backendUrl}/api/payments/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          amount,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Could not start Stripe checkout.");
      }

      const returnUrl = Linking.createURL("/pricing");
      const result = await WebBrowser.openAuthSessionAsync(payload.checkoutUrl, returnUrl);

      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const nextStatus = typeof parsed.queryParams?.payment_status === "string"
          ? parsed.queryParams.payment_status
          : "";
        const nextSessionId = typeof parsed.queryParams?.session_id === "string"
          ? parsed.queryParams.session_id
          : "";

        if (nextStatus === "success" && nextSessionId) {
          router.replace({
            pathname: "/(app)/pricing",
            params: {
              payment_status: nextStatus,
              session_id: nextSessionId,
            },
          });
          return;
        }

        if (nextStatus === "cancelled") {
          Alert.alert("Payment cancelled", "Stripe checkout was cancelled before payment completed.");
        }
      }
    } catch (error) {
      Alert.alert("Payment failed", error instanceof Error ? error.message : "Could not launch Stripe checkout.");
    } finally {
      setPendingPlanId(null);
    }
  }

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>WEEKLY SUPPORT</Text>
        <Text style={styles.title}>Choose your 9Jobs support plan</Text>
        <Text style={styles.subtitle}>
          Weekly support plans for candidates who want structured job application help and accountability.
        </Text>
      </View>

      <View style={styles.cardStack}>
        {weeklySupportPlans.map((plan) => (
          <PricingCard key={plan.title} plan={plan} amountValue={amounts[plan.id] ?? ""} onAmountChange={updateAmount} onPayNow={handlePayNow} isPaying={pendingPlanId === plan.id} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>ONE-TIME UPGRADES</Text>
        <Text style={styles.title}>Resume & Profile Optimization</Text>
        <Text style={styles.subtitle}>
          One-time professional upgrades for job seekers who do not need weekly support.
        </Text>
      </View>

      <View style={styles.cardStack}>
        {optimizationPlans.map((plan) => (
          <PricingCard key={plan.title} plan={plan} amountValue={amounts[plan.id] ?? ""} onAmountChange={updateAmount} onPayNow={handlePayNow} isPaying={pendingPlanId === plan.id} />
        ))}
      </View>
    </Screen>
  );
}

function PricingCard({
  plan,
}: {
  plan: {
    id: string;
    title: string;
    description: string;
    price: string;
    cadence: string;
    features: string[];
    accent: "light" | "dark";
    badge: string | null;
    secondaryCta: string;
  };
  amountValue: string;
  onAmountChange: (planId: string, value: string) => void;
  onPayNow: (plan: { id: string }) => Promise<void>;
  isPaying: boolean;
}) {
  const isDark = plan.accent === "dark";

  return (
    <View
      style={[
        styles.planCard,
        isDark ? styles.planCardDark : styles.planCardLight,
      ]}
    >
      {plan.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      ) : null}

      <Text style={[styles.planTitle, isDark && styles.planTitleDark]}>{plan.title}</Text>
      <Text style={[styles.planDescription, isDark && styles.planDescriptionDark]}>
        {plan.description}
      </Text>

      <View style={styles.priceRow}>
        <Text style={[styles.price, isDark && styles.priceDark]}>{plan.price}</Text>
        <Text style={[styles.cadence, isDark && styles.cadenceDark]}>{plan.cadence}</Text>
      </View>

      <View style={styles.amountEditor}>
        <Text style={[styles.amountLabel, isDark && styles.amountLabelDark]}>Editable payment amount (USD)</Text>
        <TextInput
          value={amountValue}
          onChangeText={(value) => onAmountChange(plan.id, value)}
          keyboardType="decimal-pad"
          placeholder="Enter amount"
          placeholderTextColor={isDark ? colors.darkMuted : colors.subtleText}
          style={[styles.amountInput, isDark && styles.amountInputDark]}
        />
      </View>

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Text style={[styles.check, isDark && styles.checkDark]}>✓</Text>
            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonStack}>
        <Pressable
          style={[styles.primaryButton, isDark && styles.primaryButtonAccent]}
          onPress={() => void onPayNow({ id: plan.id })}
        >
          <Text style={[styles.primaryButtonText, isDark && styles.primaryButtonTextDark]}>
            {isPaying ? "Processing..." : "Pay Now"}
          </Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 8.5H19M7 16.5H11M6 5H18C19.1046 5 20 5.89543 20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7C4 5.89543 4.89543 5 6 5Z"
              stroke={isDark ? colors.dark : colors.surface}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
          onPress={() => router.push("/(app)/contact")}
        >
          <Text style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark]}>
            {plan.secondaryCta}
          </Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke={isDark ? colors.surface : colors.text}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  sectionHeader: {
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
    lineHeight: 24,
  },
  cardStack: {
    gap: spacing.lg,
  },
  planCard: {
    borderRadius: 0,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
  },
  planCardLight: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  planCardDark: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 0,
    backgroundColor: "#D9FB63",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.label,
    color: colors.dark,
    fontWeight: "800",
  },
  planTitle: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  planTitleDark: {
    color: colors.surface,
  },
  planDescription: {
    ...typography.body,
    color: colors.mutedText,
    lineHeight: 24,
  },
  planDescriptionDark: {
    color: colors.darkMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  price: {
    ...typography.display,
    color: colors.text,
    fontSize: 34,
  },
  priceDark: {
    color: colors.surface,
  },
  cadence: {
    ...typography.body,
    color: colors.mutedText,
    fontWeight: "700",
    paddingBottom: 4,
  },
  cadenceDark: {
    color: colors.darkMuted,
  },
  featureList: {
    gap: spacing.sm,
  },
  amountEditor: {
    gap: 8,
  },
  amountLabel: {
    ...typography.label,
    color: colors.mutedText,
    fontWeight: "700",
  },
  amountLabelDark: {
    color: colors.darkMuted,
  },
  amountInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  amountInputDark: {
    backgroundColor: "#12130F",
    borderColor: "#343A2C",
    color: colors.surface,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  check: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: "800",
    marginTop: -1,
  },
  checkDark: {
    color: colors.accent,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
    fontWeight: "600",
  },
  featureTextDark: {
    color: colors.surface,
  },
  buttonStack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 0,
    backgroundColor: colors.dark,
    borderWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryButtonAccent: {
    backgroundColor: "#D9FB63",
  },
  primaryButtonText: {
    ...typography.title,
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonTextDark: {
    color: colors.dark,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  secondaryButtonDark: {
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    ...typography.title,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButtonTextDark: {
    color: colors.surface,
  },
});
