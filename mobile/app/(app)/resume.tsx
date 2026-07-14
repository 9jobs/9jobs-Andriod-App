import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Animated, Easing } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import * as DocumentPicker from "expo-document-picker";
import { useUpdateResumeScoreMutation } from "@/features/jobs/hooks";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const metrics = [
  { label: "Keywords", value: 94 },
  { label: "Formatting", value: 98 },
  { label: "Experience", value: 91 },
  { label: "Impact Verbs", value: 88 },
];

export default function ResumeScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const [activeTab, setActiveTab] = useState<"score" | "optimize" | "compare">("score");
  const [isScanning, setIsScanning] = useState(true);
  const [scoreTicker, setScoreTicker] = useState(0);
  const [matchTicker, setMatchTicker] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const updateResumeScoreMutation = useUpdateResumeScoreMutation();

  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loopAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const atsScore = Math.max(0, Math.min(100, Math.round(Number(snapshot?.trackerSummary?.atsResumeScore ?? 0))));
  const aiMatchScore = Math.max(0, Math.min(100, Math.round(Number(snapshot?.trackerSummary?.aiMatchScore ?? 0))));

  // SVG Circle Progress parameters
  const radius = 32;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;

  // Animate circular progress stroke offset
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference - (atsScore / 100) * circumference],
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
    setMatchTicker(0);
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
      setScoreTicker(atsScore);
      setMatchTicker(aiMatchScore);
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
        setScoreTicker(Math.floor(easeRatio * atsScore));
        setMatchTicker(Math.floor(easeRatio * aiMatchScore));
      }
    }, 30);

    return () => {
      clearInterval(interval);
    };
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        const newScore = Math.floor(75 + Math.random() * 22);
        updateResumeScoreMutation.mutate(newScore);
      }
    } catch (err) {
      console.warn("Document picker failed:", err);
    }
  };

  useEffect(() => {
    const cleanup = startScan();
    return () => {
      cleanup();
      if (loopAnimRef.current) {
        loopAnimRef.current.stop();
      }
    };
  }, [atsScore, aiMatchScore]);

  return (
    <Screen scroll={true} contentStyle={styles.screenContent}>
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
            {isScanning ? `SCANNING...` : `ATS SCORE: ${scoreTicker}`}
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

          <View style={styles.scoreHighlightsRow}>
            <View style={styles.scoreHighlightCard}>
              <Text style={styles.scoreHighlightLabel}>ATS Score</Text>
              <Text style={styles.scoreHighlightValue}>{scoreTicker}/100</Text>
            </View>
            <View style={styles.scoreHighlightCard}>
              <Text style={styles.scoreHighlightLabel}>AI Match Score</Text>
              <Text style={styles.scoreHighlightValue}>{matchTicker}%</Text>
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
                        ? `${Math.floor((scoreTicker / Math.max(atsScore, 1)) * metric.value)}%`
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
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Pressable style={styles.uploadButton} onPress={handleUploadResume}>
                <Text style={styles.uploadButtonText}>Upload Resume from Device</Text>
              </Pressable>

              {fileName && (
                <Text style={styles.fileNameText}>
                  📄 {fileName}
                </Text>
              )}

              <Pressable style={styles.rescanButton} onPress={startScan}>
                <Text style={styles.rescanButtonText}>Re-scan Resume</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {activeTab === "optimize" && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.tabTitleText}>Optimizations Required</Text>
          {getOptimizations(scoreTicker).map((opt, idx) => (
            <View key={idx} style={styles.optimizationCard}>
              <View style={styles.optIconBadge}>
                <Text style={styles.optBadgeText}>{opt.pts}</Text>
              </View>
              <View style={styles.optCopy}>
                <Text style={styles.optTitle}>{opt.title}</Text>
                <Text style={styles.optBody}>{opt.body}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === "compare" && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.tabTitleText}>Market Comparison</Text>
          <View style={styles.comparisonCard}>
            <Text style={styles.compareLabel}>
              {scoreTicker >= 90
                ? "Your resume is exceptional and ranks in the Top 10% of all applicants!"
                : scoreTicker >= 75
                ? "Your resume is above average. A few optimizations can push it to the Top 10%."
                : "Your resume score is below average. We recommend applying the optimizations under the Optimize tab."}
            </Text>
            <View style={styles.comparisonBarRow}>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: Math.max(18, scoreTicker), backgroundColor: colors.accent }]} />
                <Text style={styles.compareBarLabel}>You ({scoreTicker})</Text>
              </View>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: 74, backgroundColor: "rgba(255,255,255,0.35)" }]} />
                <Text style={styles.compareBarLabel}>Avg. (74)</Text>
              </View>
              <View style={styles.compareBarCol}>
                <View style={[styles.compareValueBar, { height: 88, backgroundColor: "rgba(255,255,255,0.35)" }]} />
                <Text style={styles.compareBarLabel}>Top 10% (88)</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

function getOptimizations(score: number) {
  if (score >= 90) {
    return [
      {
        pts: "+3 pts",
        title: "Refine results-oriented metrics",
        body: "Your resume is highly optimized! To stand out even more, add specific percentage increases or revenue metrics to your latest role summary.",
      },
      {
        pts: "+2 pts",
        title: "Fine-tune formatting margins",
        body: "Formatting is excellent. Ensure margins are consistent when exporting to PDF (recommended 0.75-inch).",
      }
    ];
  } else if (score >= 75) {
    return [
      {
        pts: "+6 pts",
        title: "Add remaining technical skills",
        body: "Include advanced frontend keywords: 'State Management', 'Native Bridge', or 'Clerk Authentication'.",
      },
      {
        pts: "+4 pts",
        title: "Enhance impact verbs",
        body: "Replace passive verbs with active verbs: use 'Spearheaded' instead of 'worked on', and 'Architected' instead of 'built'.",
      }
    ];
  } else {
    return [
      {
        pts: "+12 pts",
        title: "Critical technical skills missing",
        body: "Your resume lacks key technical skills for modern roles. Add: 'State Management', 'Native Bridge', 'Clerk Authentication', 'Supabase Integration'.",
      },
      {
        pts: "+8 pts",
        title: "Rewrite weak responsibility bullets",
        body: "Change passive descriptions to action-packed results. Replace 'helped team' with 'Led team of 4 developers to ship features 20% faster'.",
      },
      {
        pts: "+6 pts",
        title: "Standardize formatting layout",
        body: "Fix layout inconsistencies: ensure consistent spacing between sections and use clean sans-serif typography.",
      }
    ];
  }
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
  scoreHighlightsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  scoreHighlightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 4,
    ...shadows.card,
  },
  scoreHighlightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.mutedText,
  },
  scoreHighlightValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
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
  },
  rescanButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  uploadButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: colors.dark,
    fontSize: 15,
    fontWeight: "800",
  },
  fileNameText: {
    ...typography.label,
    color: colors.text,
    textAlign: "center",
    marginVertical: 4,
    fontWeight: "700",
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
