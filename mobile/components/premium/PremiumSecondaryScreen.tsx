import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FloatingHeroCard } from "@/components/motion/FloatingHeroCard";
import {
  DarkHeroCard,
  PremiumScaffold,
  SoftPanel,
} from "@/components/premium/PremiumScaffold";
import { PremiumList } from "@/components/premium/PremiumCollections";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Pill } from "@/components/ui/Pill";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, typography } from "@/theme";
import {
  aboutServicePillars,
  aboutWhyChooseItems,
  type PremiumScreenContent,
} from "@/lib/data/premium-content";

export function PremiumSecondaryScreen({
  content,
}: {
  content: PremiumScreenContent;
}) {
  if (content.key === "about") {
    return <AboutPremiumScreen content={content} />;
  }

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

export function AboutPremiumScreen({
  content,
}: {
  content: PremiumScreenContent;
}) {
  const proofMetrics = [
    { value: "100+", label: "Happy Clients" },
    { value: "20+", label: "Cities Covered" },
  ];

  const marketSection = content.sections.find((section) => section.title === "Australian job markets");
  const overviewSection = content.sections.find((section) => section.title === "Why it exists");
  const visionBody =
    "To become the most trusted job-search support partner for candidates building a career in Australia.";

  return (
    <Screen contentStyle={styles.aboutScreenContent}>
      <View style={styles.aboutTopBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{"<"}</Text>
        </Pressable>
        <Text style={styles.aboutTopTitle}>{content.title}</Text>
      </View>

      <LinearGradient
        colors={["#090A08", "#10110E", "#171813"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aboutHero}
      >
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <Text style={styles.aboutHeroKicker}>ABOUT US</Text>
        <Text style={styles.aboutHeroTitle}>Your Job Search.{"\n"}Our Mission.</Text>
        <Text style={styles.aboutHeroBody}>
          9Jobs is a premium job-search partner helping job seekers across Australia get noticed,
          get interviews, and get hired.
        </Text>

        <View style={styles.aboutMetricRow}>
          {proofMetrics.map((metric) => (
            <View key={metric.label} style={styles.aboutMetricCard}>
              <View style={styles.aboutMetricIconWrap}>
                <AppIcon
                  name={metric.label === "Happy Clients" ? "saved" : "pin"}
                  color={colors.accent}
                  size={15}
                  strokeWidth={2.1}
                />
              </View>
              <Text style={styles.aboutMetricValue}>{metric.value}</Text>
              <Text style={styles.aboutMetricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.aboutPanel}>
        <SectionHeading title="Who We Are" />
        <Text style={styles.aboutSectionBody}>
          9Jobs is a dedicated team of resume writers, application specialists, and career experts.
          We help you stand out in the Australian job market with optimized profiles, strategic
          applications, and end-to-end support.
        </Text>

        {overviewSection?.body ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Overview</Text>
            <Text style={styles.infoBody}>{overviewSection.body}</Text>
          </View>
        ) : null}

        <View style={styles.missionCard}>
          <View style={styles.missionTarget}>
            <View style={styles.missionRing}>
              <View style={styles.missionDot} />
            </View>
          </View>
          <View style={styles.missionCopy}>
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionBody}>
              To bridge the gap between talent and opportunity by delivering personalized,
              results-driven job search solutions.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Our Vision</Text>
          <Text style={styles.infoBody}>{visionBody}</Text>
        </View>
      </View>

      <View style={styles.aboutPanel}>
        <SectionHeading title="What We Do" />
        <View style={styles.serviceList}>
          {aboutServicePillars.map((pillar) => (
            <Pressable
              key={pillar.title}
              style={styles.serviceRow}
              onPress={() => pillar.href && router.push(pillar.href as never)}
            >
              <View style={styles.serviceRowLeft}>
                <View style={styles.serviceIconWrap}>
                  <AppIcon
                    name={getServiceIcon(pillar.title)}
                    color={colors.accentDark}
                    size={16}
                    strokeWidth={2.1}
                  />
                </View>
                <View style={styles.serviceCopy}>
                  <Text style={styles.serviceTitle}>{pillar.title}</Text>
                  <Text style={styles.serviceBody}>{pillar.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.serviceArrow}>{">"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <PrimaryButton
        label="View Our Services"
        onPress={() => router.push((content.primaryCta?.href ?? "/(app)/services") as never)}
        style={styles.servicesButton}
      />

      <View style={styles.aboutPanel}>
        <SectionHeading title="Why Choose 9Jobs?" />
        <View style={styles.whyGrid}>
          {aboutWhyChooseItems.map((item) => (
            <View key={item.title} style={styles.whyCard}>
              <View style={styles.whyIconWrap}>
                <AppIcon
                  name={getWhyChooseIcon(item.title)}
                  color={colors.accentDark}
                  size={18}
                  strokeWidth={2.1}
                />
              </View>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyBody}>{item.subtitle}</Text>
            </View>
          ))}
        </View>

        <LinearGradient
          colors={["#12130F", "#181913", "#0C0D0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quoteHero}
        >
          <View style={styles.quoteAccent} />
          <Text style={styles.quoteMark}>{"``"}</Text>
          <Text style={styles.quoteText}>
            We don't just apply - we strategize, optimize, and support you until you get hired.
          </Text>
          <Text style={styles.quoteAuthor}>9Jobs Team</Text>
        </LinearGradient>
      </View>

      {marketSection?.items?.length ? (
        <View style={styles.aboutPanel}>
          <SectionHeading title="Cities We Cover" />
          <View style={styles.marketList}>
            {marketSection.items.map((item) => (
              <Pressable
                key={item.title}
                style={styles.cityRow}
                onPress={() => item.href && router.push(item.href as never)}
              >
                <View style={styles.cityRowLeft}>
                  <View style={styles.cityIconWrap}>
                    <AppIcon name="pin" color={colors.accentDark} size={15} strokeWidth={2.1} />
                  </View>
                  <View style={styles.cityCopy}>
                    <Text style={styles.cityTitle}>{item.title}</Text>
                    <Text style={styles.cityBody}>
                      {item.badge ? `${item.badge} - ` : ""}
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cityArrow}>{">"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <LinearGradient
        colors={["#090A08", "#10110E", "#181913"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomCta}
      >
        <Text style={styles.bottomCtaTitle}>Ready to take the next step?</Text>
        <Text style={styles.bottomCtaBody}>
          Let 9Jobs be your partner in building a better career.
        </Text>
        <PrimaryButton
          label="Get Started Today"
          onPress={() => router.push("/(app)/services")}
          style={styles.bottomCtaButton}
        />
      </LinearGradient>
    </Screen>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.aboutSectionTitle}>{title}</Text>
      <View style={styles.sectionAccent} />
    </View>
  );
}

function getServiceIcon(title: string) {
  switch (title) {
    case "ATS Resume Writing":
      return "resume" as const;
    case "LinkedIn Optimization":
      return "profile" as const;
    case "Job Applications":
      return "briefcase" as const;
    case "Interview Support":
      return "mic" as const;
    case "Weekly Tracking":
      return "tracker" as const;
    default:
      return "spark" as const;
  }
}

function getWhyChooseIcon(title: string) {
  switch (title) {
    case "Proven Results":
      return "saved" as const;
    case "Expert Team":
      return "profile" as const;
    case "Time-Saving":
      return "tracker" as const;
    case "Australia Focused":
      return "spark" as const;
    default:
      return "info" as const;
  }
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
  aboutScreenContent: {
    gap: 14,
    paddingBottom: 144,
  },
  aboutTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "500",
  },
  aboutTopTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.text,
  },
  aboutHero: {
    borderRadius: 22,
    padding: 18,
    gap: 14,
    overflow: "hidden",
    ...shadows.float,
  },
  heroGlowOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    top: -34,
    right: -28,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 26,
    right: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  aboutHeroKicker: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 0.8,
    fontSize: 10,
  },
  aboutHeroTitle: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "800",
    color: colors.surface,
    maxWidth: 220,
  },
  aboutHeroBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.darkMuted,
    maxWidth: 230,
  },
  aboutMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  aboutMetricCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 4,
  },
  aboutMetricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(163,230,53,0.08)",
  },
  aboutMetricValue: {
    fontSize: 17,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.surface,
  },
  aboutMetricLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    color: colors.darkMuted,
  },
  aboutPanel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeading: {
    gap: 8,
  },
  sectionAccent: {
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  aboutSectionTitle: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "800",
    color: colors.text,
  },
  aboutSectionBody: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.mutedText,
  },
  infoCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.text,
  },
  infoBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.mutedText,
  },
  missionCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missionTarget: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  missionRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  missionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentDark,
  },
  missionCopy: {
    flex: 1,
    gap: 4,
  },
  missionTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.text,
  },
  missionBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.mutedText,
  },
  serviceList: {
    gap: 0,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 58,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceRowLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    flex: 1,
  },
  serviceIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.softAccent,
    marginTop: 2,
  },
  serviceCopy: {
    flex: 1,
    gap: 4,
  },
  serviceTitle: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.text,
  },
  serviceBody: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.mutedText,
  },
  serviceArrow: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.subtleText,
    marginLeft: 8,
  },
  servicesButton: {
    width: "100%",
    minHeight: 52,
    ...shadows.glow,
  },
  whyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  whyCard: {
    width: "48.4%",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.card,
  },
  whyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.softAccent,
  },
  whyTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.text,
  },
  whyBody: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.mutedText,
  },
  quoteHero: {
    marginTop: 6,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    ...shadows.float,
  },
  quoteAccent: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  quoteMark: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.accent,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.surface,
  },
  quoteAuthor: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
    color: colors.darkMuted,
  },
  marketList: {
    gap: 8,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cityRowLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flex: 1,
  },
  cityIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.softAccent,
  },
  cityCopy: {
    flex: 1,
    gap: 2,
  },
  cityTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.text,
  },
  cityBody: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedText,
  },
  cityArrow: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.subtleText,
  },
  bottomCta: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
    ...shadows.float,
  },
  bottomCtaTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.surface,
  },
  bottomCtaBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.darkMuted,
  },
  bottomCtaButton: {
    minHeight: 46,
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
  },
});
