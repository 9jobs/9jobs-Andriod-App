import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/theme";

import { weeklySupportPlans, optimizationPlans, type PricingPlan } from "@/lib/data/pricing-plans";

export default function PricingScreen() {
  const params = useLocalSearchParams<{ payment_status?: string; session_id?: string }>();
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);

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
          Alert.alert("Payment successful", "Your payment was completed successfully for this plan.");
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

  async function handlePayNow(plan: {
    id: string;
  }) {
    if (pendingPlanId) {
      return;
    }

    try {
      setPendingPlanId(plan.id);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
      const response = await fetch(`${backendUrl}/api/payments/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
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
        <Text style={styles.eyebrow}>PRICING PLANS</Text>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Flexible support for every stage of your Australian job search.
        </Text>
      </View>

      <View style={styles.cardStack}>
        {weeklySupportPlans.map((plan) => (
          <PricingCard key={plan.title} plan={plan} onPayNow={handlePayNow} isPaying={pendingPlanId === plan.id} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>One-Time Packages · Premium upgrades</Text>
        <Text style={styles.title}>Resume & Profile Optimization</Text>
        <Text style={styles.subtitle}>
          One-time professional upgrades for job seekers who don’t need weekly support.
        </Text>
      </View>

      <View style={styles.cardStack}>
        {optimizationPlans.map((plan) => (
          <PricingCard key={plan.title} plan={plan} onPayNow={handlePayNow} isPaying={pendingPlanId === plan.id} />
        ))}
      </View>
    </Screen>
  );
}

function PricingCard({
  plan,
  onPayNow,
  isPaying,
}: {
  plan: PricingPlan;
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

      {plan.highlights?.map((highlight) => (
        <Text key={highlight} style={[styles.planDescription, isDark && styles.planDescriptionDark]}>{highlight}</Text>
      ))}
      <View style={styles.priceRow}>
        <Text style={[styles.price, isDark && styles.priceDark]}>{plan.price}</Text>
        <Text style={[styles.gstLabel, isDark && styles.cadenceDark]}>+ 10% GST</Text>
      </View>
      <Text style={[styles.cadence, isDark && styles.cadenceDark]}>{plan.cadence}</Text>

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
          accessibilityLabel={`Pay for ${plan.title}`}
          accessibilityRole="button"
          disabled={isPaying}
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

        {plan.secondaryCta ? <Pressable
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
        </Pressable> : null}
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
   fontFamily: "Inter_600SemiBold" },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
   fontFamily: "PlusJakartaSans_700Bold" },
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
   fontFamily: "Inter_600SemiBold" },
  planTitle: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
   fontFamily: "PlusJakartaSans_600SemiBold" },
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
    flexWrap: "wrap",
    gap: 6,
  },
  price: {
    ...typography.display,
    color: colors.text,
    fontSize: 34,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  priceDark: {
    color: colors.surface,
  },
  cadence: {
    ...typography.body,
    color: colors.mutedText,
    fontWeight: "700",
    paddingBottom: 4,
   fontFamily: "Inter_600SemiBold" },
  cadenceDark: {
    color: colors.darkMuted,
  },
  featureList: {
    gap: spacing.sm,
  },
  gstLabel: {
    ...typography.label,
    color: colors.accentDark,
    paddingBottom: 5,
    fontSize: 11,
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
   fontFamily: "PlusJakartaSans_700Bold" },
  checkDark: {
    color: colors.accent,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
    fontWeight: "600",
   fontFamily: "Inter_600SemiBold" },
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
   fontFamily: "Inter_600SemiBold" },
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
   fontFamily: "Inter_600SemiBold" },
  secondaryButtonTextDark: {
    color: colors.surface,
  },
});
