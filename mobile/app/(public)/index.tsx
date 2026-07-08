import { useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, ListRenderItemInfo, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OnboardingHeroArt } from "@/components/onboarding/OnboardingHeroArt";
import { onboardingSlides } from "@/features/onboarding/content";
import { useSession } from "@/providers/SessionProvider";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { setOnboardingComplete } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const slide = onboardingSlides[activeIndex];

  const dots = useMemo(() => onboardingSlides.map((item) => item.id), []);

  async function handleAdvance() {
    if (activeIndex === onboardingSlides.length - 1) {
      await setOnboardingComplete();
      router.replace("/(public)/auth");
      return;
    }

    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    setActiveIndex((value) => value + 1);
  }

  function handleBack() {
    if (activeIndex === 0) {
      return;
    }

    listRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
    setActiveIndex((value) => value - 1);
  }

  const renderCard = ({ item }: ListRenderItemInfo<(typeof onboardingSlides)[number]>) => (
    <View style={styles.heroCardWrap}>
      <OnboardingHeroArt score={item.score} tags={item.tags} compact />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BrandLogo size={112} />
      </View>
      <FlatList
        ref={listRef}
        data={onboardingSlides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        showsHorizontalScrollIndicator={false}
      />
      <View style={styles.sheet}>
        <View style={styles.pagination}>
          {dots.map((dot, index) => (
            <View key={dot} style={[styles.dot, index === activeIndex && styles.activeDot]} />
          ))}
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
        <View style={styles.actionsRow}>
          <PrimaryButton
            label="Back"
            onPress={handleBack}
            variant="ghost"
            style={styles.backButton}
            disabled={activeIndex === 0}
          />
          <PrimaryButton
            label={slide.ctaLabel}
            onPress={handleAdvance}
            style={styles.primaryButton}
          />
        </View>
        <PrimaryButton
          label="Skip for now"
          onPress={async () => {
            await setOnboardingComplete();
            router.replace("/(public)/auth");
          }}
          variant="ghost"
          style={styles.ghostButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: colors.dark,
    paddingTop: 56,
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  heroCardWrap: {
    width,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sheet: {
    width: "100%",
    minHeight: 286,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    ...shadows.soft,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 9,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D4D4D4",
  },
  activeDot: {
    width: 26,
    backgroundColor: colors.accent,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 24,
    paddingRight: spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  backButton: {
    flex: 0.38,
    minHeight: 48,
    backgroundColor: colors.panel,
  },
  primaryButton: {
    minHeight: 48,
    flex: 0.62,
    ...shadows.glow,
  },
  ghostButton: {
    minHeight: 28,
  },
});
