import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Animated, Easing } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const metrics = [
  { label: "Keywords", value: 94 },
  { label: "Formatting", value: 98 },
  { label: "Experience", value: 91 },
  { label: "Impact Verbs", value: 88 },
];

export default function ResumeScreen() {
  const [activeTab, setActiveTab] = useState<"score" | "optimize" | "compare">("score");
  const [isScanning, setIsScanning] = useState(true);
  const [scoreTicker, setScoreTicker] = useState(0);
  const [atsTicker, setAtsTicker] = useState(0);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loopAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // SVG Circle Progress parameters
  const radius = 32;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;

  // Animate circular progress stroke offset
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference - (97 / 100) * circumference],
  });

  // Animate laser scanning line (bounds matched to grid height)
  const laserTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 172],
  });

  // Animate metrics progress bars
  const barWidth1 = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "94%"],
  });
  const barWidth2 = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "98%"],
  });
  const barWidth3 = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "91%"],
  });
  const barWidth4 = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "88%"],
  });

  const startScan = () => {
    setIsScanning(true);
    setScoreTicker(0);
    setAtsTicker(0);
    progressAnim.setValue(0);
    scanAnim.setValue(0);

    // 1. Loop laser scanner back and forth
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loopAnimRef.current = laserLoop;
    laserLoop.start();

    // 2. Animate progress values over 3 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      // Finished scanning
      setIsScanning(false);
      if (loopAnimRef.current) {
        loopAnimRef.current.stop();
      }
      setScoreTicker(97);
      setAtsTicker(92);
    });

    // 3. Score Ticker interval
    const startTime = Date.now();
    const duration = 3000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(interval);
      } else {
        const ratio = elapsed / duration;
        const easeRatio = 1 - Math.pow(1 - ratio, 2);
        setScoreTicker(Math.floor(easeRatio * 97));
        setAtsTicker(Math.floor(easeRatio * 92));
      }
    }, 30);

    return () => {
      clearInterval(interval);
    };
  };

  useEffect(() => {
    const cleanup = startScan();
    return () => {
      cleanup();
      if (loopAnimRef.current) {
        loopAnimRef.current.stop();
      }
    };
  }, []);

  return (
    <Screen contentStyle={styles.screenContent}>
      {/* Back Button & Title */}
      <BackHeader label="Back" />
      <Text style={styles.title}>Resume Intelligence</Text>

      {/* Resume Grid Preview Card (Well-spaced to prevent overlaps) */}
      <View style={styles.chartCard}>
        <View style={styles.chartGlow} />
        <View style={styles.chartGrid}>
          {/* Horizontal grid lines */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((line) => (
            <View key={`h-${line}`} style={[styles.gridLineH, { top: 16 + line * 26 }]} />
          ))}
          {/* Vertical grid lines */}
          {[0, 1, 2, 3, 4, 5, 6].map((line) => (
            <View key={`v-${line}`} style={[styles.gridLineV, { left: 18 + line * 30 }]} />
          ))}

          {/* Top Header Placeholder boxes */}
          <View style={styles.sliderThumb} />
          <View style={styles.topBarPlaceholder} />

          {/* Data Bars representing Resume details (Spaced properly at top: 36 + index * 24) */}
          {[85, 76, 92, 66, 78].map((score, index) => (
            <View key={score} style={[styles.scoreRow, { top: 36 + index * 24 }]}>
              <View style={[styles.scoreBar, { width: `${score - 20}%` }]} />
              <Text style={styles.scoreLabel}>{score}%</Text>
            </View>
          ))}

          {/* Bottom ATS score bar (Placed clear at the bottom: 178) */}
          <Text style={styles.chartFooter}>
            {isScanning ? `SCANNING...` : `ATS SCORE: ${atsTicker}`}
          </Text>

          {/* Animated Scanning Laser Line */}
          {isScanning && (
            <Animated.View style={[styles.scanLaserLine, { top: laserTop }]} />
          )}
        </View>
      </View>

      {/* Interactive Tab Selector */}
      <View style={styles.segmentRow}>
        <Segment label="Score" active={activeTab === "score"} onPress={() => setActiveTab("score")} />
        <Segment label="Optimize" active={activeTab === "optimize"} onPress={() => setActiveTab("optimize")} />
        <Segment label="Compare" active={activeTab === "compare"} onPress={() => setActiveTab("compare")} />
      </View>

      {/* Conditionally render tab content */}
      {activeTab === "score" && (
        <>
          {/* Overall Score Card */}
          <View style={styles.overallCard}>
            <View style={styles.ringWrap}>
              <Svg width={74} height={74} viewBox="0 0 74 74">
                {/* Background circle outline */}
                <Circle
                  cx="37"
                  cy="37"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Animated foreground circle path */}
                <AnimatedCircle
                  cx="37"
                  cy="37"
                  r={radius}
                  stroke={colors.accent}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 37 37)"
                />
              </Svg>
              <View style={styles.ringTextContainer}>
                <Text style={styles.ringValue}>{scoreTicker}</Text>
                <Text style={styles.ringMeta}>/100</Text>
              </View>
            </View>

            <View style={styles.overallCopy}>
              <Text style={styles.overallLabel}>Overall ATS Score</Text>
              <Text style={styles.overallTitle}>Top 3% of applicants</Text>
              <View style={[styles.excellentBadge, isScanning && { opacity: 0.5 }]}>
                <Text style={styles.excellentText}>
                  {isScanning ? "CALCULATING" : "EXCELLENT"}
                </Text>
              </View>
            </View>
          </View>

          {/* Detailed Breakdown List */}
          <View style={styles.metricsStack}>
            {metrics.map((metric, index) => {
              const animatedWidth =
                index === 0
                  ? barWidth1
                  : index === 1
                  ? barWidth2
                  : index === 2
                  ? barWidth3
                  : barWidth4;

              return (
                <View key={metric.label} style={styles.metricRow}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>
                      {isScanning
                        ? `${Math.floor((scoreTicker / 97) * metric.value)}%`
                        : `${metric.value}%`}
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <Animated.View style={[styles.metricFill, { width: animatedWidth }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Interactive Trigger Button */}
          {!isScanning && (
            <Pressable style={styles.rescanButton} onPress={startScan}>
              <Text style={styles.rescanButtonText}>Re-scan Resume</Text>
            </Pressable>
          )}
        </>
      )}

      {activeTab === "optimize" && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.tabTitleText}>Optimizations Required</Text>
          <View style={styles.optimizationCard}>
            <View style={styles.optIconBadge}>
              <Text style={styles.optBadgeText}>+6 pts</Text>
            </View>
            <View style={styles.optCopy}>
              <Text style={styles.optTitle}>Add key technical skills</Text>
              <Text style={styles.optBody}>Missing key phrases: "State Management", "Native Bridge", "Clerk Authentication".</Text>
            </View>
          </View>
          <View style={styles.optimizationCard}>
            <View style={styles.optIconBadge}>
              <Text style={styles.optBadgeText}>+4 pts</Text>
            </View>
            <View style={styles.optCopy}>
              <Text style={styles.optTitle}>Enhance impact verbs</Text>
              <Text style={styles.optBody}>Replace passive verbs with strong action verbs: "Led development", "Optimized queries".</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === "compare" && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.tabTitleText}>Market Comparison</Text>
          <View style={styles.comparisonCard}>
            <Text style={styles.compareLabel}>Compared to 450 applicants for similar roles:</Text>
            <View style={styles.comparisonBarRow}>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: 100, backgroundColor: colors.accent }]} />
                <Text style={styles.compareBarLabel}>You (97)</Text>
              </View>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: 74, backgroundColor: "rgba(255,255,255,0.15)" }]} />
                <Text style={styles.compareBarLabel}>Avg. (74)</Text>
              </View>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: 88, backgroundColor: "rgba(255,255,255,0.15)" }]} />
                <Text style={styles.compareBarLabel}>Top 10% (88)</Text>
              </View>
            </View>
          </View>
        </View>
      )}
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

function Segment({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
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
  chartCard: {
    alignSelf: "center",
    width: 200,
    borderRadius: 20,
    backgroundColor: colors.dark,
    padding: 16,
    overflow: "hidden",
    position: "relative",
    ...shadows.float,
  },
  chartGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(163,230,53,0.06)",
    top: 18,
    left: 10,
  },
  chartGrid: {
    height: 200,
    position: "relative",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(163,230,53,0.15)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(163,230,53,0.12)",
  },
  sliderThumb: {
    position: "absolute",
    top: 10,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  topBarPlaceholder: {
    position: "absolute",
    top: 15,
    left: 26,
    width: 70,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  scoreRow: {
    position: "absolute",
    left: 16,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  chartFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    bottom: 6,
    fontSize: 15,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.5,
  },
  scanLaserLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    borderRadius: radii.pill,
    padding: 5,
    gap: 6,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.dark,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.mutedText,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  overallCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  ringWrap: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.surface,
  },
  ringMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.darkMuted,
    marginTop: -2,
  },
  overallCopy: {
    flex: 1,
    gap: 4,
  },
  overallLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.darkMuted,
  },
  overallTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.surface,
    letterSpacing: -0.4,
  },
  excellentBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: "rgba(163,230,53,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  excellentText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
  },
  metricsStack: {
    gap: spacing.md,
  },
  metricRow: {
    gap: 8,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  metricTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  metricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  rescanButton: {
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  rescanButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  tabContentContainer: {
    gap: spacing.md,
  },
  tabTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  optimizationCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...shadows.card,
  },
  optIconBadge: {
    backgroundColor: colors.softAccent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  optBadgeText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: "800",
  },
  optCopy: {
    flex: 1,
    gap: 2,
  },
  optTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  optBody: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  comparisonCard: {
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  compareLabel: {
    color: colors.darkMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  comparisonBarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    paddingTop: 10,
  },
  compareBarCol: {
    alignItems: "center",
    gap: 8,
  },
  compareValueBar: {
    width: 32,
    borderRadius: 6,
  },
  compareBarLabel: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "600",
  },
});
