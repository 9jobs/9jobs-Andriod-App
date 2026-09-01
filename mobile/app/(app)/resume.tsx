import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, Animated, Easing, Clipboard, TextInput } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import * as DocumentPicker from "expo-document-picker";
import { useUploadResumeMutation } from "@/features/jobs/hooks";
import { ResumeDataTransferSpline } from "@/components/resume/ResumeDataTransferSpline";
import { AppIcon } from "@/components/ui/AppIcon";
import { useScreenPerf } from "@/lib/perf/livePerf";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircularScanner() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotation.start();
    return () => rotation.stop();
  }, [rotateAnim]);

  const rotationInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.scannerWrapper}>
      {/* Outer rotating ring */}
      <Animated.View style={[styles.scannerRing, { transform: [{ rotate: rotationInterpolate }] }]}>
        <View style={styles.scannerDot} />
        <View style={styles.scannerDotSecondary} />
      </Animated.View>
      {/* Central document icon */}
      <View style={styles.scannerCenterIcon}>
        <AppIcon name="resume" size={32} color={colors.accent} />
      </View>
    </View>
  );
}

export default function ResumeScreen() {
  const { data: trackerSummary } = usePreviewSyncSelector((snapshot) => snapshot.trackerSummary);
  const { data: resumeAnalysis } = usePreviewSyncSelector((snapshot) => snapshot.resumeAnalysis);
  const { data: coverLetterSnapshot } = usePreviewSyncSelector((snapshot) => snapshot.coverLetter);
  
  const copyToClipboard = async (text: string) => {
    try {
      const ExpoClipboard = require("expo-clipboard");
      if (ExpoClipboard && ExpoClipboard.setStringAsync) {
        await ExpoClipboard.setStringAsync(text);
        Alert.alert("Copied to Clipboard", "Cover letter copied to clipboard!");
        return;
      }
    } catch (e) {
      console.warn("expo-clipboard dynamic load failed:", e);
    }

    try {
      const rnClipboard = require("react-native").Clipboard;
      if (rnClipboard && rnClipboard.setString) {
        rnClipboard.setString(text);
        Alert.alert("Copied to Clipboard", "Cover letter copied to clipboard!");
        return;
      }
    } catch (e) {
      console.warn("react-native Clipboard dynamic load failed:", e);
    }

    Alert.alert(
      "Copy Cover Letter",
      "Auto-copy is not fully supported in this dev client. Please select and copy the text box below manually.",
      [{ text: "OK" }]
    );
  };
  const [activeTab, setActiveTab] = useState<"score" | "compare" | "cover_letter">("score");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [isScanning, setIsScanning] = useState(true);
  const [scoreTicker, setScoreTicker] = useState(0);
  const [matchTicker, setMatchTicker] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisMetrics, setAnalysisMetrics] = useState({
    keywords: 0,
    formatting: 0,
    experience: 0,
    impactVerbs: 0,
    atsScore: 0,
    roleSpecificScore: 0,
    missingKeywords: [] as string[],
    skillGapAnalysis: [] as string[],
    formattingIssues: [] as string[],
    grammarSuggestions: [] as string[],
    achievementRewriting: [] as Array<{ original: string; rewritten: string }>,
    resumeVersionComparison: "",
    jobDescriptionCompatibility: 0,
    recruiterReadabilityScore: 0,
    australianResumeComplianceCheck: { compliant: true, issues: [] as string[] },
  });

  const uploadResumeMutation = useUploadResumeMutation();
  useScreenPerf("/(app)/resume", Boolean(trackerSummary && resumeAnalysis && coverLetterSnapshot), {
    screen: "resume",
    ats_score: trackerSummary?.atsResumeScore ?? 0,
    ai_match_score: trackerSummary?.aiMatchScore ?? 0,
  });

  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loopAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [progressVal, setProgressVal] = useState(0);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setProgressVal(value);
    });
    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progressAnim]);

  const atsScore = Math.max(0, Math.min(100, Math.round(Number(trackerSummary?.atsResumeScore ?? 0))));
  const aiMatchScore = Math.max(0, Math.min(100, Math.round(Number(trackerSummary?.aiMatchScore ?? 0))));
  const metrics = [
    { label: "Keywords", value: analysisMetrics.keywords },
    { label: "Formatting", value: analysisMetrics.formatting },
    { label: "Experience", value: analysisMetrics.experience },
    { label: "Impact Verbs", value: analysisMetrics.impactVerbs },
  ];

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

  // Progress bar widths are dynamically calculated frame-by-frame using progressVal state

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
        const analysis = await uploadResumeMutation.mutateAsync({
          name: file.name,
          mimeType: file.mimeType,
          uri: file.uri,
          size: file.size,
        });
        setAnalysisMetrics({
          keywords: analysis.keywords,
          formatting: analysis.formatting,
          experience: analysis.experience,
          impactVerbs: analysis.impactVerbs,
          atsScore: analysis.atsScore || 0,
          roleSpecificScore: analysis.roleSpecificScore || 0,
          missingKeywords: analysis.missingKeywords || [],
          skillGapAnalysis: analysis.skillGapAnalysis || [],
          formattingIssues: analysis.formattingIssues || [],
          grammarSuggestions: analysis.grammarSuggestions || [],
          achievementRewriting: analysis.achievementRewriting || [],
          resumeVersionComparison: analysis.resumeVersionComparison || "",
          jobDescriptionCompatibility: analysis.jobDescriptionCompatibility || 0,
          recruiterReadabilityScore: analysis.recruiterReadabilityScore || 0,
          australianResumeComplianceCheck: analysis.australianResumeComplianceCheck || { compliant: true, issues: [] },
        });
        if (analysis.coverLetter) {
          setCoverLetter(analysis.coverLetter);
        }
        setScoreTicker(analysis.atsScore);
        setMatchTicker(analysis.aiMatchScore);
        Alert.alert("Resume analyzed", `Your Gemini ATS score is ${analysis.atsScore}/100.`);
      }
    } catch (err) {
      console.warn("Document picker failed:", err);
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Resume could not be uploaded.");
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

  useEffect(() => {
    if (resumeAnalysis) {
      setAnalysisMetrics({
        keywords: resumeAnalysis.keywords || 0,
        formatting: resumeAnalysis.formatting || 0,
        experience: resumeAnalysis.experience || 0,
        impactVerbs: resumeAnalysis.impactVerbs || 0,
        atsScore: resumeAnalysis.atsScore || 0,
        roleSpecificScore: resumeAnalysis.roleSpecificScore || 0,
        missingKeywords: resumeAnalysis.missingKeywords || [],
        skillGapAnalysis: resumeAnalysis.skillGapAnalysis || [],
        formattingIssues: resumeAnalysis.formattingIssues || [],
        grammarSuggestions: resumeAnalysis.grammarSuggestions || [],
        achievementRewriting: resumeAnalysis.achievementRewriting || [],
        resumeVersionComparison: resumeAnalysis.resumeVersionComparison || "",
        jobDescriptionCompatibility: resumeAnalysis.jobDescriptionCompatibility || 0,
        recruiterReadabilityScore: resumeAnalysis.recruiterReadabilityScore || 0,
        australianResumeComplianceCheck: resumeAnalysis.australianResumeComplianceCheck || { compliant: true, issues: [] },
      });
    }
  }, [resumeAnalysis]);

  useEffect(() => {
    if (coverLetterSnapshot) {
      setCoverLetter(coverLetterSnapshot.content || "");
    }
  }, [coverLetterSnapshot]);

  return (
    <Screen scroll={true} contentStyle={styles.screenContent}>
      {/* Back Button & Title */}
      <BackHeader label="Back" />
      <Text style={styles.title}>{activeTab === "cover_letter" ? "Cover Letter" : "Resume Intelligence"}</Text>

      {/* Resume Grid Preview Card (Well-spaced to prevent overlaps) */}
      <View style={styles.chartCard}>
        <ResumeDataTransferSpline />
        <View pointerEvents="none" style={styles.transferGrid}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((line) => (
            <View key={`transfer-h-${line}`} style={[styles.transferLineH, { top: line * 31 }]} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((line) => (
            <View key={`transfer-v-${line}`} style={[styles.transferLineV, { left: line * 34 }]} />
          ))}
          <Animated.View style={[styles.scanLaserLine, { top: laserTop }]} />
        </View>
        <View pointerEvents="none" style={styles.splineBrandingCover} />
        <Text style={styles.chartFooter}>{isScanning ? "SCANNING..." : `ATS SCORE: ${scoreTicker}`}</Text>
      </View>

      {/* Interactive Tab Selector */}
      <View style={styles.segmentRow}>
        <Segment label="Score" active={activeTab === "score"} onPress={() => setActiveTab("score")} />
        <Segment label="Compare" active={activeTab === "compare"} onPress={() => setActiveTab("compare")} />
        <Segment label="Cover Letter" active={activeTab === "cover_letter"} onPress={() => setActiveTab("cover_letter")} />
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
            {metrics.map((metric) => {
              const fillWidth = `${metric.value}%` as any;

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
                    <View style={[styles.metricFill, { width: fillWidth }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Interactive Trigger Button */}
          {!isScanning && (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Pressable
                style={[styles.uploadButton, uploadResumeMutation.isPending && styles.buttonDisabled]}
                onPress={handleUploadResume}
                disabled={uploadResumeMutation.isPending}
              >
                {uploadResumeMutation.isPending ? (
                  <ActivityIndicator color={colors.dark} />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload Resume from Device</Text>
                )}
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

          {/* AI Resume Intelligence Dashboard */}
          {!isScanning && (
            <View style={styles.aiIntelContainer}>
              <Text style={styles.aiIntelTitle}>AI Resume Intelligence</Text>
              
              {/* Score Progress Bars (Styled like Keywords, Formatting, etc.) */}
              <View style={[styles.metricsStack, { marginBottom: spacing.md }]}>
                {/* 1. ATS Score Detail */}
                <View style={styles.metricRow}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>ATS Score Detail</Text>
                    <Text style={styles.metricValue}>
                      {isScanning
                        ? `${Math.floor((scoreTicker / Math.max(atsScore, 1)) * (analysisMetrics.atsScore || scoreTicker))}%`
                        : `${analysisMetrics.atsScore || scoreTicker}%`}
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <View style={[styles.metricFill, { width: `${analysisMetrics.atsScore || scoreTicker}%` as any }]} />
                  </View>
                </View>

                {/* 2. Role-Specific Score */}
                <View style={styles.metricRow}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Role-Specific Score</Text>
                    <Text style={styles.metricValue}>
                      {isScanning
                        ? `${Math.floor((scoreTicker / Math.max(atsScore, 1)) * analysisMetrics.roleSpecificScore)}%`
                        : `${analysisMetrics.roleSpecificScore}%`}
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <View style={[styles.metricFill, { width: `${analysisMetrics.roleSpecificScore}%` as any }]} />
                  </View>
                </View>

                {/* 9. JD Compatibility */}
                <View style={styles.metricRow}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Job Description Compatibility</Text>
                    <Text style={styles.metricValue}>
                      {isScanning
                        ? `${Math.floor((scoreTicker / Math.max(atsScore, 1)) * analysisMetrics.jobDescriptionCompatibility)}%`
                        : `${analysisMetrics.jobDescriptionCompatibility}%`}
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <View style={[styles.metricFill, { width: `${analysisMetrics.jobDescriptionCompatibility}%` as any }]} />
                  </View>
                </View>

                {/* 10. Recruiter Readability Score */}
                <View style={styles.metricRow}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Recruiter Readability Score</Text>
                    <Text style={styles.metricValue}>
                      {isScanning
                        ? `${Math.floor((scoreTicker / Math.max(atsScore, 1)) * analysisMetrics.recruiterReadabilityScore)}%`
                        : `${analysisMetrics.recruiterReadabilityScore}%`}
                    </Text>
                  </View>
                  <View style={styles.metricTrack}>
                    <View style={[styles.metricFill, { width: `${analysisMetrics.recruiterReadabilityScore}%` as any }]} />
                  </View>
                </View>
              </View>

              {/* 11. Australian Resume Compliance Check */}
              <View style={styles.complianceCard}>
                <View style={styles.complianceHeader}>
                  <Text style={styles.complianceTitle}>Australian Compliance Check</Text>
                  <View style={[styles.complianceBadge, { backgroundColor: (analysisMetrics.australianResumeComplianceCheck?.compliant) ? "rgba(110, 231, 183, 0.18)" : "rgba(250, 204, 21, 0.18)" }]}>
                    <Text style={[styles.complianceBadgeText, { color: (analysisMetrics.australianResumeComplianceCheck?.compliant) ? colors.accentDark : colors.warning }]}>
                      {(analysisMetrics.australianResumeComplianceCheck?.compliant) ? "COMPLIANT" : "ACTION REQUIRED"}
                    </Text>
                  </View>
                </View>
                {analysisMetrics.australianResumeComplianceCheck?.issues && analysisMetrics.australianResumeComplianceCheck.issues.length > 0 ? (
                  <View style={styles.bulletList}>
                    {analysisMetrics.australianResumeComplianceCheck.issues.map((issue, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>⚠️</Text>
                        <Text style={styles.bulletText}>{issue}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.complianceSuccessText}>✓ Resume meets all standard Australian compliance criteria (no photo, no personal details, clean format).</Text>
                )}
              </View>

              {/* 3. Missing Keywords */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Missing Keywords</Text>
                {analysisMetrics.missingKeywords && analysisMetrics.missingKeywords.length > 0 ? (
                  <View style={styles.keywordBadgeContainer}>
                    {analysisMetrics.missingKeywords.map((kw, idx) => (
                      <View key={idx} style={styles.keywordBadge}>
                        <Text style={styles.keywordBadgeText}>+ {kw}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No missing keywords detected. Resume is highly optimized!</Text>
                )}
              </View>

              {/* 4. Skill-gap Analysis */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Skill-Gap Analysis</Text>
                {analysisMetrics.skillGapAnalysis && analysisMetrics.skillGapAnalysis.length > 0 ? (
                  <View style={styles.bulletList}>
                    {analysisMetrics.skillGapAnalysis.map((gap, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{gap}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No major skill gaps identified for your target roles.</Text>
                )}
              </View>

              {/* 5. Formatting Issues */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Formatting Issues</Text>
                {analysisMetrics.formattingIssues && analysisMetrics.formattingIssues.length > 0 ? (
                  <View style={styles.bulletList}>
                    {analysisMetrics.formattingIssues.map((issue, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{issue}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No formatting issues detected. Layout looks clean!</Text>
                )}
              </View>

              {/* 6. Grammar Suggestions */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Grammar & Language Suggestions</Text>
                {analysisMetrics.grammarSuggestions && analysisMetrics.grammarSuggestions.length > 0 ? (
                  <View style={styles.bulletList}>
                    {analysisMetrics.grammarSuggestions.map((sug, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{sug}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No grammatical errors or spelling issues found.</Text>
                )}
              </View>

              {/* 7. Achievement Rewriting */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Achievement Rewriting Suggestions</Text>
                {analysisMetrics.achievementRewriting && analysisMetrics.achievementRewriting.length > 0 ? (
                  <View style={{ gap: spacing.md }}>
                    {analysisMetrics.achievementRewriting.map((rewrite, idx) => (
                      <View key={idx} style={styles.rewriteContainer}>
                        <View style={styles.rewriteOriginal}>
                          <Text style={styles.rewriteLabel}>Original</Text>
                          <Text style={styles.rewriteTextOriginal}>"{rewrite.original}"</Text>
                        </View>
                        <View style={styles.rewriteSuggested}>
                          <Text style={[styles.rewriteLabel, { color: colors.accentDark }]}>Suggested AI Rewrite</Text>
                          <Text style={styles.rewriteTextSuggested}>"{rewrite.rewritten}"</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>Your achievements are already written in high-impact action-oriented language.</Text>
                )}
              </View>

              {/* 8. Resume Version Comparison */}
              <View style={styles.aiDetailCard}>
                <Text style={styles.cardSectionTitle}>Resume Version & Standard Comparison</Text>
                <Text style={styles.comparisonBody}>
                  {analysisMetrics.resumeVersionComparison || "Comparison information will load after scanning your resume."}
                </Text>
              </View>
            </View>
          )}
        </>
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

      {activeTab === "cover_letter" && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.tabTitleText}>AI-Generated Cover Letter</Text>
          <View style={styles.coverLetterCard}>
            {coverLetter ? (
              <>
                <TextInput
                  style={styles.coverLetterBody}
                  multiline={true}
                  scrollEnabled={false}
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  selectTextOnFocus={true}
                />
                <Pressable
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(coverLetter)}
                >
                  <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                </Pressable>

                <Pressable
                  style={[styles.uploadButton, { marginTop: spacing.md }, uploadResumeMutation.isPending && styles.buttonDisabled]}
                  onPress={handleUploadResume}
                  disabled={uploadResumeMutation.isPending}
                >
                  {uploadResumeMutation.isPending ? (
                    <ActivityIndicator color={colors.dark} />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload New Resume</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Text style={styles.emptyText}>Upload your resume to generate a customized cover letter.</Text>
                <Pressable
                  style={[styles.uploadButton, uploadResumeMutation.isPending && styles.buttonDisabled]}
                  onPress={handleUploadResume}
                  disabled={uploadResumeMutation.isPending}
                >
                  {uploadResumeMutation.isPending ? (
                    <ActivityIndicator color={colors.dark} />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload Resume from Device</Text>
                  )}
                </Pressable>
              </View>
            )}
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
    height: 232,
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
  transferGrid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    opacity: 0.55,
  },
  transferLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(163,230,53,0.26)",
  },
  transferLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(163,230,53,0.2)",
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
    bottom: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    fontSize: 15,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.5,
  },
  splineBrandingCover: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: 64,
    backgroundColor: colors.dark,
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
  buttonDisabled: {
    opacity: 0.7,
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
  scannerWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: spacing.md,
  },
  scannerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: "rgba(163, 230, 53, 0.25)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  scannerDot: {
    position: "absolute",
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scannerDotSecondary: {
    position: "absolute",
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(163, 230, 53, 0.6)",
  },
  scannerCenterIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(163, 230, 53, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(163, 230, 53, 0.3)",
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  scanningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  scanningHeader: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  scanningSubtitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 22,
    textAlign: "center",
  },
  scanningDescription: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  scanningProgressContainer: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  scanningProgressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  scanningProgressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  scanningProgressText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  scanningMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  scanningMetricItem: {
    alignItems: "center",
    width: "30%",
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  scanningMetricLabel: {
    ...typography.label,
    color: colors.mutedText,
    fontSize: 11,
  },
  scanningMetricValue: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  scanningFooter: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
    fontSize: 12.5,
    fontStyle: "italic",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  aiIntelContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  aiIntelTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  aiIntelRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  aiIntelMetricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
    ...shadows.card,
  },
  aiIntelMetricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.mutedText,
  },
  aiIntelMetricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  aiIntelProgressBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  aiIntelProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  complianceCard: {
    backgroundColor: colors.darkCard || colors.dark,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complianceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  complianceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  complianceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  complianceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: colors.accent,
    marginTop: -1,
  },
  bulletText: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    flex: 1,
  },
  complianceSuccessText: {
    fontSize: 13,
    color: colors.accent,
    lineHeight: 18,
  },
  aiDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  keywordBadgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  keywordBadge: {
    backgroundColor: colors.chipMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  keywordBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedText,
    fontStyle: "italic",
  },
  rewriteContainer: {
    backgroundColor: colors.surfaceMuted || "#FCFBF7",
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewriteOriginal: {
    gap: 2,
  },
  rewriteSuggested: {
    gap: 2,
  },
  rewriteLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.mutedText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rewriteTextOriginal: {
    fontSize: 13,
    color: colors.subtleText,
    fontStyle: "italic",
  },
  rewriteTextSuggested: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text,
  },
  comparisonBody: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 19,
  },
  coverLetterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadows.card,
  },
  coverLetterBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    backgroundColor: colors.chipMuted,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: "top",
    textAlign: "justify",
  },
  copyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  copyButtonText: {
    color: colors.dark,
    fontWeight: "800",
    fontSize: 14,
  },
});
