import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Animated, Image } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function InterviewScreen() {
  const [isRecording, setIsRecording] = useState(false);

  // Animated values for continuous staggered wave ripples
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAnimation = (val: Animated.Value) => {
      val.setValue(0);
      Animated.loop(
        Animated.timing(val, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        })
      ).start();
    };

    // Start Ring 1 immediately
    runAnimation(pulseAnim1);

    // Stagger Ring 2 by 700ms using JS timeout
    const t2 = setTimeout(() => {
      runAnimation(pulseAnim2);
    }, 700);

    // Stagger Ring 3 by 1400ms using JS timeout
    const t3 = setTimeout(() => {
      runAnimation(pulseAnim3);
    }, 1400);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
      pulseAnim3.stopAnimation();
    };
  }, [pulseAnim1, pulseAnim2, pulseAnim3]);

  // Expand scale from 0.7 to 1.45 (rippling out)
  const scale1 = pulseAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.45],
  });
  const scale2 = pulseAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.45],
  });
  const scale3 = pulseAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.45],
  });

  // Fade in at start, fade out at outer boundary
  const opacity1 = pulseAnim1.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 0.9, 0.35, 0],
  });
  const opacity2 = pulseAnim2.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 0.9, 0.35, 0],
  });
  const opacity3 = pulseAnim3.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 0.9, 0.35, 0],
  });

  // Border colors matching recording status
  const waveBorderColor = isRecording
    ? "rgba(239, 68, 68, 0.24)"
    : "rgba(163, 230, 53, 0.22)";

  return (
    <Screen contentStyle={styles.screenContent}>
      {/* Header */}
      <BackHeader label="Back" />
      <Text style={styles.title}>Interview Prep</Text>

      {/* 1. AI Interviewer Card with perfectly centered continuous wave ripples */}
      <View style={styles.hero}>
        <View style={styles.avatarContainer}>
          {/* Wave Ripple Ring 1 */}
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: waveBorderColor,
                transform: [{ scale: scale1 }],
                opacity: opacity1,
              },
            ]}
          />
          {/* Wave Ripple Ring 2 */}
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: waveBorderColor,
                transform: [{ scale: scale2 }],
                opacity: opacity2,
              },
            ]}
          />
          {/* Wave Ripple Ring 3 */}
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: waveBorderColor,
                transform: [{ scale: scale3 }],
                opacity: opacity3,
              },
            ]}
          />
          
          {/* Profile photo */}
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
            }}
            style={styles.avatar}
          />
          
          {/* HIRING badge overlapping bottom edge of profile photo */}
          <View style={styles.hiringBadge}>
            <Text style={styles.hiringBadgeText}>HIRING</Text>
          </View>
        </View>

        <Text style={styles.heroName}>AI Interviewer — Sarah</Text>
        <Text style={styles.heroRole}>Google · Engineering Manager</Text>
      </View>

      {/* 2. Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionMeta}>QUESTION 1 OF 4</Text>
        <Text style={styles.questionText}>Tell me about yourself and your background</Text>
        <View style={styles.tagRow}>
          <Badge label="Behavioral" />
          <Badge label="Leadership" />
        </View>
      </View>

      {/* 3. Recording Interface (with clean green outline mic icon) */}
      <View style={styles.answerBlock}>
        <View>
          <Pressable
            style={[styles.micButton, isRecording && { backgroundColor: "red" }]}
            onPress={() => setIsRecording(!isRecording)}
          >
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              {/* Clean outline mic body */}
              <Path
                d="M12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2Z"
                stroke={isRecording ? colors.surface : colors.accent}
                strokeWidth={2}
                fill="none"
              />
              {/* Mic stand */}
              <Path
                d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10"
                stroke={isRecording ? colors.surface : colors.accent}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Path
                d="M12 18V22"
                stroke={isRecording ? colors.surface : colors.accent}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
        <Text style={[styles.answerText, isRecording && { color: "red", fontWeight: "700" }]}>
          {isRecording ? "Recording... Tap to stop" : "Tap to answer"}
        </Text>
      </View>

      {/* 4. AI Feedback Panel */}
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>AI Feedback · Previous answer</Text>
        <Text style={styles.feedbackBody}>
          Strong STAR structure. Consider adding more quantifiable outcomes — e.g., "reduced churn
          by 18%". Your pacing was excellent.
        </Text>
        <View style={styles.scoreGrid}>
          <ScoreStat label="Clarity" value="88" />
          <ScoreStat label="Impact" value="72" />
          <ScoreStat label="Structure" value="95" />
        </View>
      </View>

      {/* 5. Bottom Navigation row */}
      <View style={styles.bottomNavRow}>
        <Pressable style={styles.prevButton} onPress={() => router.back()}>
          <Text style={styles.prevButtonText}>← Prev</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={() => router.back()}>
          <Text style={styles.nextButtonText}>Next →</Text>
        </Pressable>
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

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreStat}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 80,
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
  hero: {
    height: 250,
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  avatarContainer: {
    position: "relative",
    width: 170,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#7D9386",
    zIndex: 10,
  },
  ring: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2.2,
    zIndex: 1,
  },
  hiringBadge: {
    position: "absolute",
    bottom: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 20,
    ...shadows.float,
  },
  hiringBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text,
  },
  heroName: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  heroRole: {
    fontSize: 13,
    color: colors.darkMuted,
    fontWeight: "500",
    marginTop: 2,
  },
  questionCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.float,
  },
  questionMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7782A1",
    letterSpacing: 0.5,
  },
  questionText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  badge: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(163,230,53,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  answerBlock: {
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.float,
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedText,
  },
  feedbackCard: {
    borderRadius: radii.lg,
    backgroundColor: "#F4F7EE",
    borderWidth: 1,
    borderColor: "#E2EBC8",
    padding: spacing.lg,
    gap: spacing.md,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.accentDark,
  },
  feedbackBody: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  scoreGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.04)",
    paddingTop: 12,
  },
  scoreStat: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.subtleText,
  },
  bottomNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  prevButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  prevButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  nextButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
});
