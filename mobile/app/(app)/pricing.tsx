import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const weeklySupportPlans = [
  {
    title: "Trial",
    description:
      "Try the full 9Jobs experience for a day — perfect for a quick, focused job search sprint.",
    price: "$25",
    cadence: "/ 1 day",
    features: [
      "Full platform access",
      "Resume review",
      "Application support",
      "1-day support window",
    ],
    accent: "light" as const,
    badge: null,
    secondaryCta: "Get a schedule",
  },
  {
    title: "Non-IT",
    description:
      "Hands-on weekly support tailored for non-tech professionals ready to land their next role.",
    price: "$200",
    cadence: "/ week",
    features: [
      "Resume & LinkedIn review",
      "Application tracking",
      "Job search strategy",
      "Follow-up support",
      "Weekly check-in",
    ],
    accent: "light" as const,
    badge: "Popular",
    secondaryCta: "Get a schedule",
  },
  {
    title: "IT",
    description:
      "Premium weekly support for tech professionals — from ATS-ready resumes to interview prep.",
    price: "$250",
    cadence: "/ week",
    features: [
      "Tech resume optimization",
      "LinkedIn & GitHub review",
      "ATS keyword targeting",
      "Interview prep support",
      "Weekly check-in",
    ],
    accent: "dark" as const,
    badge: null,
    secondaryCta: "Get a schedule",
  },
];

const optimizationPlans = [
  {
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
          <PricingCard key={plan.title} plan={plan} />
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
          <PricingCard key={plan.title} plan={plan} />
        ))}
      </View>
    </Screen>
  );
}

function PricingCard({
  plan,
}: {
  plan: {
    title: string;
    description: string;
    price: string;
    cadence: string;
    features: string[];
    accent: "light" | "dark";
    badge: string | null;
    secondaryCta: string;
  };
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
          onPress={() => router.push("/(app)/contact")}
        >
          <Text style={[styles.primaryButtonText, isDark && styles.primaryButtonTextDark]}>
            Pay Now
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
