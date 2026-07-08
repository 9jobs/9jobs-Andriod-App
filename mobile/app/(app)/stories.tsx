import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

// Detailed mockup success stories for 5 clients with image avatars
const stories = [
  {
    name: "Jasmine Park",
    role: "Barista → UX Designer at Apple",
    time: "4 months",
    quote: '"9Jobs helped me land my dream role. The resume AI was a game-changer."',
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    name: "David Okonkwo",
    role: "Marketing → PM at Stripe",
    time: "6 months",
    quote: '"The interview prep feature alone is worth 10x the subscription cost."',
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    name: "Sarah Jenkins",
    role: "Customer Support → CSM at Slack",
    time: "3 months",
    quote: '"The automated outreach saved me hundreds of hours. I got 5 interviews in 2 weeks!"',
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    name: "Carlos Mendez",
    role: "Bootcamp Grad → Dev at Figma",
    time: "5 months",
    quote: '"The tracking board kept me organized and motivated. Best tool for junior developers."',
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    name: "Elena Rostova",
    role: "QA Engineer → QA Lead at Vercel",
    time: "2 months",
    quote: '"Negotiation tips helped me boost my starting offer by 15%. Highly recommend!"',
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
  },
];

export default function StoriesScreen() {
  return (
    <Screen contentStyle={styles.screenContent}>
      {/* Header */}
      <BackHeader label="Back" />
      <Text style={styles.title}>Success Stories</Text>

      {/* Hero Trophy Banner */}
      <View style={styles.heroCard}>
        <View style={styles.trophyWrap}>
          {/* Detailed custom SVG trophy */}
          <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9H4.5A2.5 2.5 0 0 1 2 6.5v0A2.5 2.5 0 0 1 4.5 4H6"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M18 4h1.5A2.5 2.5 0 0 1 22 6.5v0a2.5 2.5 0 0 1-2.5 2.5H18"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M6 4h12v7a6 6 0 0 1-12 0V4Z"
              stroke={colors.accent}
              strokeWidth={2}
              fill="rgba(163,230,53,0.12)"
            />
            <Path
              d="M12 17v4M8 21h8"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="m12 7 .8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3L12 7Z"
              fill={colors.accent}
            />
          </Svg>
          <Text style={styles.offerText}>OFFER RECEIVED</Text>
        </View>
        
        <View style={styles.heroStats}>
          <Text style={styles.heroBig}>50K+</Text>
          <Text style={styles.heroSmall}>offers received</Text>
          <Text style={styles.heroBig}>$142k</Text>
          <Text style={styles.heroSmall}>avg. salary landed</Text>
        </View>
      </View>

      {/* 5 Scrollable Client Story Cards */}
      <View style={styles.storyStack}>
        {stories.map((story) => (
          <View key={story.name} style={styles.storyCard}>
            <View style={styles.storyTop}>
              {/* Profile Photo with green outline border */}
              <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
              
              <View style={styles.storyCopy}>
                <Text style={styles.storyName}>{story.name}</Text>
                <Text style={styles.storyRole}>{story.role}</Text>
              </View>
              
              {/* Soft Green Duration Badge */}
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{story.time}</Text>
              </View>
            </View>
            
            <Text style={styles.quote}>{story.quote}</Text>
            
            {/* Custom Green Rating Stars */}
            <Text style={styles.stars}>★★★★★</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function BackHeader({ label }: { label: string }) {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12H5M5 12L12 19M5 12L12 5"
          stroke={colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110, // extra padding for bottom tab bar clearance
    gap: spacing.lg,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    paddingVertical: 28,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.float,
  },
  trophyWrap: {
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 12,
  },
  offerText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  heroStats: {
    gap: 2,
    flex: 1,
    paddingLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
  },
  heroBig: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  heroSmall: {
    fontSize: 12,
    color: colors.darkMuted,
    fontWeight: "500",
    marginBottom: 8,
  },
  storyStack: {
    gap: spacing.md,
  },
  storyCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: 12,
    ...shadows.card,
  },
  storyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: colors.accent,
    backgroundColor: "#F3F4F6",
  },
  storyCopy: {
    flex: 1,
    gap: 2,
  },
  storyName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  storyRole: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "500",
  },
  timeBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.softAccent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "center",
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accentDark,
  },
  quote: {
    fontSize: 14,
    color: "#4F524A",
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 2,
  },
  stars: {
    color: colors.accentDark,
    fontSize: 16,
    letterSpacing: 2,
  },
});
