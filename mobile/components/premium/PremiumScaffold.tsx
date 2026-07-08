import { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedScreenShell } from "@/components/motion/AnimatedScreenShell";
import { CTAReveal } from "@/components/motion/CTAReveal";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

type PremiumScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  kicker?: string;
  rightSlot?: ReactNode;
  hero?: ReactNode;
  scroll?: boolean;
}>;

export function PremiumScaffold({
  children,
  title,
  subtitle,
  kicker,
  rightSlot,
  hero,
  scroll = true,
}: PremiumScaffoldProps) {
  return (
    <Screen scroll={scroll}>
      <AnimatedScreenShell>
        <View style={styles.header}>
          <View style={styles.copy}>
            {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
      </AnimatedScreenShell>
      {hero ? (
        <CTAReveal>
          <View style={styles.hero}>{hero}</View>
        </CTAReveal>
      ) : null}
      <AnimatedScreenShell>
        <View style={styles.body}>{children}</View>
      </AnimatedScreenShell>
    </Screen>
  );
}

export function DarkHeroCard({ children }: PropsWithChildren) {
  return (
    <View style={styles.darkHeroWrap}>
      <View style={styles.darkHero}>{children}</View>
    </View>
  );
}

export function SoftPanel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  kicker: {
    ...typography.label,
    color: colors.accentDark,
    letterSpacing: 0.8,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
    maxWidth: 320,
  },
  hero: {
    gap: spacing.md,
  },
  body: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  darkHeroWrap: {
    borderRadius: radii.xl,
    backgroundColor: colors.heroBorder,
    padding: 1,
  },
  darkHero: {
    backgroundColor: colors.dark,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.float,
  },
  panel: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.card,
  },
});
