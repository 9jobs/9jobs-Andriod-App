import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { requireOptionalNativeModule } from "expo-modules-core";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { fetchInterviewPrepSession, requestInterviewPrepAnswer } from "@/lib/data/interview-prep";
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, shadows, spacing, typography } from "@/theme";

type ExpoSpeechModule = {
  speak: (id: string, text: string, options?: Record<string, unknown>) => void;
  stop: () => Promise<void> | void;
};

type SpeechRecognitionPermission = {
  granted: boolean;
};

type SpeechRecognitionResultEvent = {
  isFinal: boolean;
  results: Array<{
    transcript: string;
  }>;
};

type SpeechRecognitionErrorEvent = {
  error?: string;
  message?: string;
};

type SpeechRecognitionSubscription = {
  remove: () => void;
};

type OptionalSpeechRecognitionModule = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<SpeechRecognitionPermission>;
  isRecognitionAvailable?: () => boolean;
  addListener: (
    eventName: "start" | "end" | "result" | "error",
    listener: ((event: SpeechRecognitionResultEvent) => void) | ((event: SpeechRecognitionErrorEvent) => void) | (() => void),
  ) => SpeechRecognitionSubscription;
};

function getSpeechModule(): null | { speak: (text: string) => void; stop: () => void } {
  try {
    const nativeSpeech = requireOptionalNativeModule<ExpoSpeechModule>("ExpoSpeech");
    if (!nativeSpeech) {
      return null;
    }

    return {
      speak: (text: string) => {
        nativeSpeech.speak(String(Date.now()), text, {});
      },
      stop: () => {
        void nativeSpeech.stop();
      },
    };
  } catch (error) {
    console.warn("[Interview Screen] expo-speech native module is unavailable:", error);
    return null;
  }
}

function getSpeechRecognitionModule(): OptionalSpeechRecognitionModule | null {
  try {
    return requireOptionalNativeModule<OptionalSpeechRecognitionModule>("ExpoSpeechRecognition");
  } catch (error) {
    console.warn("[Interview Screen] expo-speech-recognition native module is unavailable:", error);
    return null;
  }
}

export default function InterviewScreen() {
  const { user } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [screenData, setScreenData] = useState<any>(null);

  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const transcriptRef = useRef("");
  const submittedTranscriptRef = useRef(false);
  const speechModuleRef = useRef<OptionalSpeechRecognitionModule | null>(getSpeechRecognitionModule());

  const refreshSession = async () => {
    const payload = await fetchInterviewPrepSession(user);
    setScreenData(payload);
  };

  useEffect(() => {
    const runAnimation = (val: Animated.Value) => {
      val.setValue(0);
      Animated.loop(
        Animated.timing(val, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ).start();
    };

    runAnimation(pulseAnim1);
    const t2 = setTimeout(() => runAnimation(pulseAnim2), 700);
    const t3 = setTimeout(() => runAnimation(pulseAnim3), 1400);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
      pulseAnim3.stopAnimation();
      speechModuleRef.current?.abort();
      getSpeechModule()?.stop();
    };
  }, [pulseAnim1, pulseAnim2, pulseAnim3]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError("");
        const payload = await fetchInterviewPrepSession(user);
        setScreenData(payload);
      } catch (err: any) {
        setError(err.message || "Could not load interview preparation.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, [user]);

  useEffect(() => {
    const speechRecognitionModule = speechModuleRef.current;
    if (!speechRecognitionModule) {
      return;
    }

    const submitTranscript = async (rawTranscript?: string) => {
      const transcript = (rawTranscript ?? transcriptRef.current).trim();
      if (!transcript || submittedTranscriptRef.current) {
        return;
      }

      submittedTranscriptRef.current = true;

      try {
        setIsGeneratingAnswer(true);
        setError("");
        const result = await requestInterviewPrepAnswer(user, transcript);
        await refreshSession();
        const spokenAnswer = result?.response?.ai_answer;
        if (spokenAnswer) {
          getSpeechModule()?.speak(spokenAnswer);
        }
      } catch (err: any) {
        submittedTranscriptRef.current = false;
        setError(err.message || "Could not generate interview answer.");
      } finally {
        setIsGeneratingAnswer(false);
      }
    };

    const startSubscription = speechRecognitionModule.addListener("start", () => {
      setIsRecording(true);
      setError("");
    });

    const endSubscription = speechRecognitionModule.addListener("end", () => {
      setIsRecording(false);
      if (!submittedTranscriptRef.current && transcriptRef.current.trim()) {
        void submitTranscript();
      }
    });

    const resultSubscription = speechRecognitionModule.addListener("result", (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results?.[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        return;
      }

      transcriptRef.current = transcript;

      if (event.isFinal) {
        void submitTranscript(transcript);
      }
    });

    const errorSubscription = speechRecognitionModule.addListener("error", (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      setIsGeneratingAnswer(false);
      if (event.error === "aborted") {
        return;
      }

      setError(event.message || "Voice assistant is not available right now.");
    });

    return () => {
      startSubscription.remove();
      endSubscription.remove();
      resultSubscription.remove();
      errorSubscription.remove();
    };
  }, [user]);

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

  const waveBorderColor = isRecording ? "rgba(239, 68, 68, 0.24)" : "rgba(163, 230, 53, 0.22)";

  const interviewer = screenData?.interviewer;
  const currentQuestion = screenData?.currentQuestion;
  const latestResponse = screenData?.responses?.[0] ?? null;
  const feedbackBody =
    latestResponse?.ai_answer ||
    screenData?.session?.last_ai_answer ||
    "Tap the mic to generate a strong AI interview answer for this question.";
  const feedbackHint =
    latestResponse?.feedback ||
    screenData?.session?.last_feedback ||
    "Your generated answer and coaching feedback will appear here.";
  const clarityScore = String(latestResponse?.clarity_score ?? screenData?.session?.last_clarity_score ?? 0);
  const impactScore = String(latestResponse?.impact_score ?? screenData?.session?.last_impact_score ?? 0);
  const structureScore = String(latestResponse?.structure_score ?? screenData?.session?.last_structure_score ?? 0);

  const handleGenerateAnswer = async () => {
    const speechRecognitionModule = speechModuleRef.current;
    if (!speechRecognitionModule) {
      setError("Voice assistant needs a fresh Android build to enable speech recognition.");
      return;
    }

    if (isRecording) {
      speechRecognitionModule.stop();
      return;
    }

    try {
      setError("");
      transcriptRef.current = "";
      submittedTranscriptRef.current = false;
      getSpeechModule()?.stop();

      if (speechRecognitionModule.isRecognitionAvailable && !speechRecognitionModule.isRecognitionAvailable()) {
        setError("Speech recognition is unavailable on this device right now.");
        return;
      }

      const permission = await speechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required for interview voice answers.");
        return;
      }

      speechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (err: any) {
      setIsRecording(false);
      setIsGeneratingAnswer(false);
      setError(err.message || "Could not start voice capture.");
    }
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <BackHeader label="Back" />
      <Text style={styles.title}>Interview Prep</Text>

      <View style={styles.hero}>
        <View style={styles.avatarContainer}>
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

          <Image
            source={{
              uri:
                interviewer?.avatarUrl ||
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
            }}
            style={styles.avatar}
          />

          <View style={styles.hiringBadge}>
            <Text style={styles.hiringBadgeText}>HIRING</Text>
          </View>
        </View>

        <Text style={styles.heroName}>{interviewer?.name || "AI Interviewer - Sarah"}</Text>
        <Text style={styles.heroRole}>
          {interviewer ? `${interviewer.company} · ${interviewer.role}` : "Google · Engineering Manager"}
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionMeta}>
          {currentQuestion ? `QUESTION ${currentQuestion.index + 1} OF ${currentQuestion.total}` : "QUESTION 1 OF 4"}
        </Text>
        <Text style={styles.questionText}>
          {currentQuestion?.text || (isLoading ? "Loading your interview question..." : "Tell me about yourself and your background")}
        </Text>
        <View style={styles.tagRow}>
          {(currentQuestion?.tags || ["Behavioral", "Leadership"]).map((tag: string) => (
            <Badge key={tag} label={tag} />
          ))}
        </View>
      </View>

      <View style={styles.answerBlock}>
        <View>
          <Pressable style={[styles.micButton, isRecording && { backgroundColor: "red" }]} onPress={() => void handleGenerateAnswer()} disabled={isLoading || isGeneratingAnswer}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2Z"
                stroke={isRecording ? colors.surface : colors.accent}
                strokeWidth={2}
                fill="none"
              />
              <Path
                d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10"
                stroke={isRecording ? colors.surface : colors.accent}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Path d="M12 18V22" stroke={isRecording ? colors.surface : colors.accent} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
        <Text style={[styles.answerText, isRecording && { color: "red", fontWeight: "700" }]}>
          {isRecording
            ? "Listening... tap again to stop"
            : isGeneratingAnswer
              ? "Generating... Please wait"
              : isLoading
                ? "Loading interview session"
                : "Tap to answer"}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>AI Feedback · Latest answer</Text>
        <Text style={styles.feedbackBody}>{feedbackBody}</Text>
        <Text style={styles.feedbackHint}>{feedbackHint}</Text>
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
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D64545",
    textAlign: "center",
    maxWidth: 260,
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
    color: colors.text,
    lineHeight: 20,
    fontWeight: "600",
  },
  feedbackHint: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 19,
  },
});
