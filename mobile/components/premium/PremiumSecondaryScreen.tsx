import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { FloatingHeroCard } from "@/components/motion/FloatingHeroCard";
import {
  DarkHeroCard,
  PremiumScaffold,
  SoftPanel,
} from "@/components/premium/PremiumScaffold";
import { PremiumList } from "@/components/premium/PremiumCollections";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Pill } from "@/components/ui/Pill";
import { colors, typography } from "@/theme";
import type { PremiumScreenContent } from "@/lib/data/premium-content";

export function PremiumSecondaryScreen({
  content,
}: {
  content: PremiumScreenContent;
}) {
  return (
    <PremiumScaffold
      title={content.title}
      subtitle={content.subtitle}
      kicker={content.kicker}
      hero={
        <DarkHeroCard>
          <Text style={styles.heroKicker}>9Jobs Premium</Text>
          <Text style={styles.heroTitle}>{content.subtitle}</Text>
          <Text style={styles.heroBody}>
            Built as part of the premium 9Jobs flow with working navigation and demo content.
          </Text>
          <View style={styles.highlightRow}>
            {content.highlights.slice(0, 3).map((item) => (
              <View key={item} style={styles.highlightChip}>
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
          <FloatingHeroCard>
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <View style={styles.previewOrb} />
                <View style={styles.previewCopy}>
                  <View style={styles.previewStrong} />
                  <View style={styles.previewSoft} />
                </View>
              </View>
              <View style={styles.previewLines}>
                <View style={styles.previewLineFull} />
                <View style={styles.previewLine} />
                <View style={[styles.previewLine, styles.previewLineShort]} />
              </View>
            </View>
          </FloatingHeroCard>
          {content.primaryCta ? (
            <PrimaryButton
              label={content.primaryCta.label}
              onPress={() => router.push(content.primaryCta?.href as never)}
            />
          ) : null}
        </DarkHeroCard>
      }
    >
      <SoftPanel>
        <View style={styles.pillWrap}>
        {content.highlights.map((item) => (
          <Pill key={item} label={item} selected />
        ))}
        </View>
      </SoftPanel>
      {content.sections.map((section) => (
        <SoftPanel key={section.title}>
          <Text style={{ ...typography.title, color: colors.text }}>{section.title}</Text>
          {section.body ? (
            <Text style={{ ...typography.body, color: colors.mutedText }}>{section.body}</Text>
          ) : null}
          {section.items ? <PremiumList items={section.items} /> : null}
        </SoftPanel>
      ))}
      {content.secondaryCta ? (
        <PrimaryButton
          label={content.secondaryCta.label}
          onPress={() => router.push(content.secondaryCta?.href as never)}
          variant="ghost"
        />
      ) : null}
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  heroKicker: {
    ...typography.label,
    color: colors.accent,
  },
  heroTitle: {
    ...typography.headline,
    color: colors.surface,
  },
  heroBody: {
    ...typography.body,
    color: colors.darkMuted,
  },
  highlightRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  highlightChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.darkChip,
  },
  highlightText: {
    ...typography.label,
    color: colors.surface,
  },
  previewCard: {
    marginTop: 4,
    borderRadius: 24,
    backgroundColor: colors.heroSurface,
    padding: 18,
    gap: 16,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
  },
  previewCopy: {
    flex: 1,
    gap: 8,
  },
  previewStrong: {
    width: "60%",
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  previewSoft: {
    width: "36%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#A7A89F",
  },
  previewLines: {
    gap: 8,
  },
  previewLineFull: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  previewLine: {
    width: "88%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C7C5BC",
  },
  previewLineShort: {
    width: "64%",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
