import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing } from "@/theme";

// Services list data matching mockup exactly
const SERVICES_DATA = [
  {
    id: "tracker",
    title: "Job Application Service",
    subtitle: "Apply, track applications, deadlines, an...",
    icon: "tracker",
    route: "/(app)/tracker",
    badge: null,
    isIconDark: false,
  },
  {
    id: "resume",
    title: "Resume Intelligence",
    subtitle: "AI scoring, ATS optimization, keyword g...",
    icon: "resume",
    route: "/(app)/resume",
    badge: "AI",
    isIconDark: true, // Black background, green icon
  },
  {
    id: "outreach",
    title: "Hiring Manager Outreach",
    subtitle: "Find contacts, craft messages, track op...",
    icon: "mail",
    route: "/(app)/outreach",
    badge: "PRO",
    isIconDark: true,
  },
  {
    id: "interview",
    title: "Interview Prep",
    subtitle: "Mock interviews, AI feedback, question ...",
    icon: "mic",
    route: "/(app)/interview",
    badge: "AI",
    isIconDark: true,
  },
  {
    id: "stories",
    title: "Success Stories",
    subtitle: "Learn from 10k+ offer journeys",
    icon: "star",
    route: "/(app)/stories",
    badge: null,
    isIconDark: true,
  },
  {
    id: "pricing",
    title: "Pricing & Plans",
    subtitle: "Free, Pro, and Enterprise tiers",
    icon: "pricing",
    route: "/(app)/pricing",
    badge: null,
    isIconDark: false,
  },
];

// Twinkling Spark component for background stars animation
function TwinklingSpark({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(Math.random())).current;

  useEffect(() => {
    const startTwinkle = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15 + Math.random() * 0.85,
          duration: 800 + Math.random() * 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.05 + Math.random() * 0.2,
          duration: 800 + Math.random() * 1500,
          useNativeDriver: true,
        }),
      ]).start(() => startTwinkle());
    };

    startTwinkle();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { FadeInView } from "@/components/motion/FadeInView";

export default function ServicesScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const serviceOrder = ["job-tracker", "tracker", "resume-intelligence", "resume", "hiring-manager-outreach", "outreach", "interview-prep", "interview", "success-stories", "stories", "pricing"];
  const services = [...(snapshot?.services ?? SERVICES_DATA)]
    .map((service) => {
      if (service.id === "job-tracker" || service.id === "tracker" || service.title === "Job Tracker") {
        return {
          ...service,
          title: "Job Application Service",
          route: "/(app)/tracker",
          isIconDark: true,
        };
      }

      return service;
    })
    .sort((left, right) => {
      const leftIndex = serviceOrder.indexOf(left.id);
      const rightIndex = serviceOrder.indexOf(right.id);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight;
    });

  return (
    <Screen scroll={true} contentStyle={styles.screenContent}>
      {/* 1. Header Section */}
      <FadeInView type="fade-down" delay={0}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Services</Text>
          <Text style={styles.headerSubtitle}>Everything you need to land the job</Text>
        </View>
      </FadeInView>

      {/* 2. Hero Card (Job Search Command Center) */}
      <FadeInView type="fade-up" delay={60}>
        <View style={styles.heroCardContainer}>
          {/* Background Twinkling Sparks */}
          <View style={StyleSheet.absoluteFill}>
            {Array.from({ length: 15 }).map((_, index) => (
              <TwinklingSpark
                key={index}
                style={[
                  styles.heroSpark,
                  {
                    top: `${10 + (index * 7) % 80}%`,
                    left: `${5 + (index * 19) % 90}%`,
                  },
                ]}
              />
            ))}
          </View>

          {/* Hero Card Layout */}
          <View style={styles.heroRow}>
            {/* Left Column: Command Center Text */}
            <View style={styles.heroLeftCol}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>ALL-IN-ONE</Text>
              </View>
              <Text style={styles.heroTitleText}>Your Job Search Command Center</Text>
            </View>

            {/* Right Column: Mini Job Card */}
            <View style={styles.heroRightCol}>
              <View style={styles.miniJobCard}>
                <View style={styles.miniCardTopRow}>
                  <View style={styles.miniLogoCircle}>
                    <Text style={styles.miniLogoText}>G</Text>
                  </View>
                  <View style={styles.miniTitleCol}>
                    <Text style={styles.miniJobTitle} numberOfLines={1}>Google</Text>
                    <Text style={styles.miniJobCompany} numberOfLines={1}>Sr. Product Designer</Text>
                  </View>
                  <View style={styles.heartIconWrap}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill={colors.accent}>
                      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </Svg>
                  </View>
                </View>

                <View style={styles.miniCardLocRow}>
                  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 21C15.5 16.8 18 13.7 18 10.5C18 6.9 15.3 4 12 4C8.7 4 6 6.9 6 10.5C6 13.7 8.5 16.8 12 21Z"
                      stroke={colors.accent}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle cx="12" cy="10" r="2.5" fill={colors.accent} />
                  </Svg>
                  <Text style={styles.miniLocText}>Remote · Full-time</Text>
                </View>

                <View style={styles.miniCardBottomRow}>
                  <Text style={styles.miniSalaryText}>$145k</Text>
                  <View style={styles.miniNewBadge}>
                    <Text style={styles.miniNewText}>New</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* 3. Services List Section */}
      <View style={styles.servicesList}>
        {services.map((service, index) => (
          (() => {
            const useDarkIconBackground =
              service.isIconDark ||
              service.id === "hiring-manager-outreach" ||
              service.id === "outreach" ||
              service.icon === "mail";

            return (
              <FadeInView key={service.id} type="fade-up" delay={120 + index * 40}>
                <AnimatedPressable
                  style={styles.serviceCard}
                  onPress={() => router.push(service.route as never)}
                  scaleTo={0.97}
                >
                  {/* Left: Custom Alternating Icon wrapper */}
                  <View
                    style={[
                      styles.iconContainer,
                      useDarkIconBackground
                        ? { backgroundColor: colors.dark }
                        : { backgroundColor: "rgba(163, 230, 53, 0.12)" },
                    ]}
                  >
                    {service.icon === "star" ? (
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                          stroke={useDarkIconBackground ? colors.accent : colors.text}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    ) : service.icon === "pricing" ? (
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M6 18L10 13L13 16L18 9"
                          stroke={colors.text}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M18 9H14"
                          stroke={colors.text}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                      </Svg>
                    ) : (
                      <AppIcon
                        name={service.icon as any}
                        color={useDarkIconBackground ? colors.accent : colors.text}
                        size={20}
                        strokeWidth={2.2}
                      />
                    )}
                  </View>

                  {/* Center: Title, Badge and Description */}
                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      {service.badge === "AI" ? (
                        <View style={styles.aiBadge}>
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      ) : service.badge === "PRO" ? (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.serviceSubtitle} numberOfLines={1}>
                      {service.subtitle}
                    </Text>
                  </View>

                  {/* Right: Chevron arrow */}
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 5L16 12L9 19"
                      stroke={colors.subtleText}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </AnimatedPressable>
              </FadeInView>
            );
          })()
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  header: {
    gap: 4,
    marginTop: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.mutedText,
    fontWeight: "500",
  },
  heroCardContainer: {
    backgroundColor: colors.dark,
    borderRadius: radii.xl,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  heroSpark: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroLeftCol: {
    flex: 1.1,
    gap: 10,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(163, 230, 53, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  heroTitleText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heroRightCol: {
    flex: 0.9,
    alignItems: "flex-end",
  },
  miniJobCard: {
    width: "100%",
    backgroundColor: "#F2EFE6",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  miniCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLogoText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  miniTitleCol: {
    flex: 1,
    gap: 1,
  },
  miniJobTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  miniJobCompany: {
    fontSize: 10,
    color: colors.mutedText,
    fontWeight: "500",
  },
  heartIconWrap: {
    marginLeft: "auto",
  },
  miniCardLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniLocText: {
    fontSize: 10,
    color: colors.mutedText,
    fontWeight: "500",
  },
  miniCardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  miniSalaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  miniNewBadge: {
    backgroundColor: "rgba(163, 230, 53, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniNewText: {
    color: colors.accentDark,
    fontSize: 9,
    fontWeight: "800",
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...shadows.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  aiBadge: {
    backgroundColor: colors.softAccent,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    color: colors.accentDark,
    fontSize: 10,
    fontWeight: "800",
  },
  proBadge: {
    backgroundColor: colors.dark,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
  },
  serviceSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "500",
  },
});
