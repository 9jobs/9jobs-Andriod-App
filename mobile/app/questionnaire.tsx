import { useEffect, useMemo, useState, useRef, memo, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Redirect, router } from "expo-router";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useSession } from "@/providers/SessionProvider";
import {
  submitCandidateQuestionnaire,
  uploadQuestionnaireDocument,
  type QuestionnaireDocument,
} from "@/lib/data/candidate-questionnaire";
import { colors, radii, spacing, typography } from "@/theme";

type FormState = {
  fullName: string;
  contactNumber: string;
  gender: string;
  dateOfBirth: string;
  workingRights: string;
  fullAddress: string;
  expectedSalary: string;
  preferredJobLocations: string;
  workTypes: string[];
  noticePeriod: string;
  preferredRoles: string;
  visaType: string;
};

const STEPS = [
  { key: "fullName", title: "Hello! Let’s start with your full name.", subtitle: "Share the name recruiters should see across your 9Jobs career profile." },
  { key: "contactNumber", title: "Where can the right opportunity reach you?", subtitle: "Add the best phone number for recruiter updates." },
  { key: "gender", title: "What’s your gender?", subtitle: "Select the option that best describes you." },
  { key: "dateOfBirth", title: "When’s your birthday?", subtitle: "Choose your date of birth from the calendar." },
  { key: "workingRights", title: "What are your Australian working rights?", subtitle: "This helps us target suitable opportunities." },
  { key: "fullAddress", title: "What’s your current full address?", subtitle: "Include suburb, state and postcode." },
  { key: "expectedSalary", title: "What salary are you expecting?", subtitle: "For example: AUD 90k–110k." },
  { key: "preferredJobLocations", title: "Where would you prefer to work?", subtitle: "List one or more locations, separated by commas." },
  { key: "workTypes", title: "What type of work do you prefer?", subtitle: "You can select more than one option." },
  { key: "noticePeriod", title: "What’s your notice period?", subtitle: "Select when you can start a new role." },
  { key: "preferredRoles", title: "Which roles are you targeting?", subtitle: "List all preferred roles, separated by commas." },
  { key: "documents", title: "Upload your documents", subtitle: "Resume is required. Visa / work-rights document is optional. Add your visa type if applicable." },
] as const;

const OPTION_MAP: Record<string, string[]> = {
  gender: ["Male", "Female", "Non-binary", "Prefer not to say", "Other"],
  workingRights: ["Australian Citizen", "Permanent Resident", "Work Visa", "Student Visa", "Bridging Visa", "Other"],
  workTypes: ["Full-time", "Part-time", "Contract", "Casual", "Remote", "Hybrid"],
  noticePeriod: ["Immediately", "1 week", "2 weeks", "4 weeks", "More than 4 weeks"],
};

export default function CandidateQuestionnaireScreen() {
  const { user, hasCompletedOnboarding, setOnboardingComplete } = useSession();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const isPickingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const lastStepTimeRef = useRef(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateDraft, setDateDraft] = useState({ day: "", month: "", year: "" });
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(1995, 0, 1, 12));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resume, setResume] = useState<QuestionnaireDocument | null>(null);
  const [visa, setVisa] = useState<QuestionnaireDocument | null>(null);
  const [form, setForm] = useState<FormState>({
    fullName: user?.fullName || "",
    contactNumber: user?.phoneNumber || "",
    gender: "",
    dateOfBirth: "",
    workingRights: "",
    fullAddress: "",
    expectedSalary: "",
    preferredJobLocations: "",
    workTypes: [],
    noticePeriod: "",
    preferredRoles: "",
    visaType: "",
  });

  const currentStep = STEPS[step];
  const progress = `${((step + 1) / STEPS.length) * 100}%` as `${number}%`;
  const selectedOptions = OPTION_MAP[currentStep.key] || [];
  const textValue = currentStep.key in form && !Array.isArray(form[currentStep.key as keyof FormState])
    ? String(form[currentStep.key as keyof FormState] || "")
    : "";
  const keyboardType = currentStep.key === "contactNumber" ? "phone-pad" : "default";
  const canContinue = useMemo(() => {
    if (currentStep.key === "documents") return Boolean(resume);
    if (currentStep.key === "workTypes") return form.workTypes.length > 0;
    return textValue.trim().length > 0;
  }, [currentStep.key, form.workTypes.length, resume, textValue]);

  const moveCalendar = useCallback((months: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + months, 1, 12));
  }, []);

  const moveCalendarYear = useCallback((years: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear() + years, current.getMonth(), 1, 12));
  }, []);

  const chooseCalendarDay = useCallback((day: number) => {
    setDateDraft({
      day: String(day).padStart(2, "0"),
      month: String(calendarMonth.getMonth() + 1).padStart(2, "0"),
      year: String(calendarMonth.getFullYear()),
    });
    setError("");
  }, [calendarMonth]);

  if (!user) return <Redirect href="/(public)/auth/sign-up" />;
  if (hasCompletedOnboarding) return <Redirect href="/(app)" />;

  function setTextValue(value: string) {
    if (currentStep.key === "documents" || currentStep.key === "workTypes") return;
    setForm((current) => ({ ...current, [currentStep.key]: value }));
    setError("");
  }

  function openDatePicker() {
    const [year = "", month = "", day = ""] = form.dateOfBirth.split("-");
    setDateDraft({ day, month, year });
    setCalendarMonth(new Date(Number(year) || 1995, Math.max(0, (Number(month) || 1) - 1), 1, 12));
    setShowDatePicker(true);
  }

  function selectDate() {
    const day = Number(dateDraft.day);
    const month = Number(dateDraft.month);
    const year = Number(dateDraft.year);
    const candidate = new Date(year, month - 1, day, 12, 0, 0);
    const today = new Date();
    const valid = year >= 1940 && year <= today.getFullYear()
      && month >= 1 && month <= 12
      && day >= 1 && day <= 31
      && candidate.getFullYear() === year
      && candidate.getMonth() === month - 1
      && candidate.getDate() === day
      && candidate <= today;
    if (!valid) {
      setError("Choose a valid date of birth.");
      return;
    }
    setShowDatePicker(false);
    setForm((current) => ({ ...current, dateOfBirth: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` }));
    setError("");
  }

  function selectOption(option: string) {
    if (currentStep.key === "workTypes") {
      setForm((current) => ({
        ...current,
        workTypes: current.workTypes.includes(option)
          ? current.workTypes.filter((item) => item !== option)
          : [...current.workTypes, option],
      }));
    } else if (currentStep.key === "gender" || currentStep.key === "workingRights" || currentStep.key === "noticePeriod") {
      setForm((current) => ({ ...current, [currentStep.key]: option }));
    }
    setError("");
  }

  async function chooseDocument(type: "resume" | "visa") {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/png",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const selected = result.assets[0];
      const file = { name: selected.name, mimeType: selected.mimeType, uri: selected.uri, size: selected.size };
      if (type === "resume") setResume(file);
      else setVisa(file);
      setError("");
    } finally {
      isPickingRef.current = false;
    }
  }

  function validateCurrentStep() {
    if (!canContinue) return currentStep.key === "documents"
      ? "Please upload your resume."
      : "Please answer this question to continue.";
    return "";
  }

  async function handleContinue() {
    const now = Date.now();
    if (now - lastStepTimeRef.current < 500) return;
    lastStepTimeRef.current = now;

    if (isSubmittingRef.current) return;
    const activeUser = user;
    if (!activeUser) return;
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    if (!resume) return;

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError("");
      const uploadedResume = await uploadQuestionnaireDocument(activeUser, "resume", resume);
      const uploadedVisa = visa ? await uploadQuestionnaireDocument(activeUser, "visa", visa) : { path: "", name: "" };
      await submitCandidateQuestionnaire(activeUser, {
        fullName: form.fullName.trim(),
        contactNumber: form.contactNumber.trim(),
        workingRights: form.workingRights,
        fullAddress: form.fullAddress.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        expectedSalary: form.expectedSalary.trim(),
        preferredJobLocations: form.preferredJobLocations.split(",").map((item) => item.trim()).filter(Boolean),
        workTypes: form.workTypes,
        noticePeriod: form.noticePeriod,
        preferredRoles: form.preferredRoles.split(",").map((item) => item.trim()).filter(Boolean),
        resumePath: uploadedResume.path,
        resumeName: uploadedResume.name,
        visaType: form.visaType.trim(),
        visaPath: uploadedVisa.path,
        visaName: uploadedVisa.name,
      });
      await setOnboardingComplete();
      router.replace("/(app)");
    } catch (submissionError) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setError(submissionError instanceof Error ? submissionError.message : "Could not save your questionnaire.");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}>
      <QuestionnaireAmbientAnimation />
      <View style={[styles.progressTrack, { marginTop: insets.top + spacing.sm }]}><View style={[styles.progressFill, { width: progress }]} /></View>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, step === 0 && styles.backButtonHidden]} onPress={() => {
          const now = Date.now();
          if (now - lastStepTimeRef.current < 500) return;
          lastStepTimeRef.current = now;
          step > 0 && setStep((value) => value - 1);
        }} disabled={step === 0}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.stepChip}><Text style={styles.stepChipText}>{step + 1} / {STEPS.length}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <View style={styles.brandRow}><View style={styles.brandDot} /><Text style={styles.brandText}>9JOBS CAREER SETUP</Text></View>
        {step === 0 ? <CareerPassportVisual name={form.fullName} /> : null}
        <Animated.Text entering={FadeInUp.duration(220)} key={`${currentStep.key}-title`} style={styles.title}>{currentStep.title}</Animated.Text>
        <Animated.Text entering={FadeInUp.duration(220).delay(40)} key={`${currentStep.key}-subtitle`} style={styles.subtitle}>{currentStep.subtitle}</Animated.Text>

        {selectedOptions.length > 0 ? (
          <View style={styles.optionList}>
            {selectedOptions.map((option) => {
              const selected = currentStep.key === "workTypes" ? form.workTypes.includes(option) : textValue === option;
              return (
                <Pressable key={option} style={[styles.option, selected && styles.optionSelected]} onPress={() => selectOption(option)}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  <View style={[styles.selectionCircle, selected && styles.selectionCircleSelected]} />
                </Pressable>
              );
            })}
          </View>
        ) : currentStep.key === "documents" ? (
          <View style={styles.documentList}>
            <DocumentButton label="Resume" required file={resume} onPress={() => void chooseDocument("resume")} />
            <DocumentButton label="Visa / Work-rights document" required={false} file={visa} onPress={() => void chooseDocument("visa")} />
            <Animated.View entering={FadeInDown.duration(220)} style={[styles.inputShell, form.visaType.trim() && styles.inputFilled]}>
              <TextInput
                value={form.visaType}
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, visaType: value }));
                  setError("");
                }}
                autoCapitalize="words"
                placeholder="Visa type (optional)"
                placeholderTextColor={colors.darkMuted}
                style={styles.input}
              />
              {form.visaType.trim() ? <View style={styles.filledBadge}><Text style={styles.filledBadgeText}>✓</Text></View> : null}
            </Animated.View>
            <Text style={styles.documentHint}>Accepted: PDF, DOC, DOCX, JPG or PNG · Maximum 12 MB</Text>
          </View>
        ) : currentStep.key === "dateOfBirth" ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose date of birth" style={[styles.dateField, form.dateOfBirth && styles.inputFilled]} onPress={openDatePicker}>
              <View>
                <Text style={styles.dateLabel}>DATE OF BIRTH</Text>
                <Text style={[styles.dateValue, !form.dateOfBirth && styles.datePlaceholder]}>{form.dateOfBirth || "Choose from calendar"}</Text>
              </View>
              <Text style={styles.calendarIcon}>▦</Text>
            </Pressable>
          </>
        ) : (
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.inputShell, textValue.trim() && styles.inputFilled]}>
            <TextInput
              autoFocus
              value={textValue}
              onChangeText={setTextValue}
              keyboardType={keyboardType}
              autoCapitalize={currentStep.key === "fullName" || currentStep.key === "fullAddress" || currentStep.key === "preferredRoles" ? "words" : "sentences"}
              placeholder={currentStep.key === "fullName" ? "Your full name" : "Add your answer here"}
              placeholderTextColor={colors.darkMuted}
              style={styles.input}
              multiline={["fullAddress", "preferredJobLocations", "preferredRoles"].includes(currentStep.key)}
            />
            {textValue.trim() ? <View style={styles.filledBadge}><Text style={styles.filledBadgeText}>✓</Text></View> : null}
          </Animated.View>
        )}

        {error ? <Text selectable style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
        <Pressable style={[styles.continueButton, (!canContinue || isSubmitting) && styles.continueDisabled]} onPress={() => void handleContinue()} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.continueText}>{step === STEPS.length - 1 ? "Save & Start" : "Continue"}</Text>}
        </Pressable>
      </View>

      <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.dateModalBackdrop}>
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.dateModalCard, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.dateModalHandle} />
            <Text style={styles.dateModalEyebrow}>9JOBS DATE SELECTOR</Text>
            <Text style={styles.dateModalTitle}>Choose your date of birth</Text>
            <Text style={styles.dateModalSubtitle}>Choose a day from the calendar. Use the year controls to move faster.</Text>
            <CalendarPicker month={calendarMonth} selected={dateDraft} onDayPress={chooseCalendarDay} onMoveMonth={moveCalendar} onMoveYear={moveCalendarYear} />
            <View style={styles.dateModalActions}>
              <Pressable style={styles.dateCancelButton} onPress={() => setShowDatePicker(false)}><Text style={styles.dateCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.dateConfirmButton} onPress={selectDate}><Text style={styles.dateConfirmText}>Use this date</Text></Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const AMBIENT_PARTICLES = [
  { left: "8%", top: "18%", size: 5, delay: 0 },
  { left: "88%", top: "13%", size: 6, delay: 0.18 },
  { left: "78%", top: "28%", size: 4, delay: 0.36 },
  { left: "16%", top: "43%", size: 6, delay: 0.54 },
  { left: "92%", top: "49%", size: 5, delay: 0.72 },
  { left: "68%", top: "59%", size: 7, delay: 0.25 },
  { left: "11%", top: "70%", size: 4, delay: 0.48 },
  { left: "83%", top: "77%", size: 6, delay: 0.66 },
  { left: "26%", top: "86%", size: 5, delay: 0.84 },
] as const;

const QuestionnaireAmbientAnimation = memo(function QuestionnaireAmbientAnimation() {
  const { width, height } = useWindowDimensions();
  const flow = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    flow.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    shimmer.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(flow);
      cancelAnimation(shimmer);
    };
  }, [flow, shimmer]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -width * 0.24 + flow.value * width * 0.42 },
      { translateY: (flow.value - 0.5) * 16 },
    ],
  }));
  const particleStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + shimmer.value * 0.5,
    transform: [{ translateX: shimmer.value * 12 }, { translateY: -shimmer.value * 14 }],
  }));

  return (
    <View testID="questionnaire-ambient-animation" pointerEvents="none" style={styles.ambientLayer}>
      <Animated.View style={[styles.ambientWave, { top: height * 0.36 }, waveStyle]}>
        <Svg width={width * 1.7} height={230} viewBox="0 0 620 190" fill="none">
          {[0, 10, 20, 30, 40, 50, 60].map((offset, index) => (
            <Path
              key={offset}
              d={`M-20 ${116 + offset * 0.35} C 92 ${20 + offset}, 188 ${178 - offset * 0.45}, 308 ${101 + offset * 0.2} S 510 ${23 + offset}, 650 ${91 + offset * 0.25}`}
              stroke={colors.accent}
              strokeWidth={index === 3 ? 2 : 1.2}
              opacity={0.24 + index * 0.025}
            />
          ))}
          <Circle cx="116" cy="80" r="4" fill={colors.accent} opacity="0.82" />
          <Circle cx="315" cy="100" r="5" fill={colors.accent} opacity="0.92" />
          <Circle cx="496" cy="60" r="3.5" fill={colors.accent} opacity="0.84" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.ambientParticles, particleStyle]}>
        {AMBIENT_PARTICLES.map((particle, index) => (
          <View
            key={`${particle.left}-${particle.top}`}
            style={[
              styles.ambientParticle,
              {
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                opacity: 0.65 + particle.delay * 0.35,
              },
              index % 3 === 0 && styles.ambientParticleGlow,
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
});

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

const CalendarPicker = memo(function CalendarPicker({ month, selected, onDayPress, onMoveMonth, onMoveYear }: { month: Date; selected: { day: string; month: string; year: string }; onDayPress: (day: number) => void; onMoveMonth: (months: number) => void; onMoveYear: (years: number) => void }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekDay = new Date(year, monthIndex, 1, 12).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekDay + 1;
    return day > 0 && day <= daysInMonth ? day : 0;
  });

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarYearRow}>
        <Pressable accessibilityLabel="Previous ten years" style={styles.calendarMiniButton} onPress={() => onMoveYear(-10)}><Text style={styles.calendarMiniText}>−10</Text></Pressable>
        <Pressable accessibilityLabel="Previous year" style={styles.calendarMiniButton} onPress={() => onMoveYear(-1)}><Text style={styles.calendarMiniText}>−1</Text></Pressable>
        <Text style={styles.calendarYear}>{year}</Text>
        <Pressable accessibilityLabel="Next year" style={styles.calendarMiniButton} onPress={() => onMoveYear(1)}><Text style={styles.calendarMiniText}>+1</Text></Pressable>
        <Pressable accessibilityLabel="Next ten years" style={styles.calendarMiniButton} onPress={() => onMoveYear(10)}><Text style={styles.calendarMiniText}>+10</Text></Pressable>
      </View>
      <View style={styles.calendarMonthRow}>
        <Pressable accessibilityLabel="Previous month" style={styles.calendarArrow} onPress={() => onMoveMonth(-1)}><Text style={styles.calendarArrowText}>‹</Text></Pressable>
        <Text style={styles.calendarMonth}>{MONTH_NAMES[monthIndex]}</Text>
        <Pressable accessibilityLabel="Next month" style={styles.calendarArrow} onPress={() => onMoveMonth(1)}><Text style={styles.calendarArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {WEEK_DAYS.map((label, index) => <Text key={`${label}-${index}`} style={styles.calendarWeekDay}>{label}</Text>)}
        {cells.map((day, index) => {
          const isSelected = day > 0 && Number(selected.day) === day && Number(selected.month) === monthIndex + 1 && Number(selected.year) === year;
          return day ? (
            <Pressable accessibilityLabel={`${day} ${MONTH_NAMES[monthIndex]} ${year}`} key={index} style={[styles.calendarDay, isSelected && styles.calendarDaySelected]} onPress={() => onDayPress(day)}>
              <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day}</Text>
            </Pressable>
          ) : <View key={index} style={styles.calendarDay} />;
        })}
      </View>
    </View>
  );
});

const CareerPassportVisual = memo(function CareerPassportVisual({ name }: { name: string }) {
  const motion = useSharedValue(0);

  useEffect(() => {
    motion.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(motion);
  }, [motion]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: motion.value * 18 }, { translateY: motion.value * -5 }, { rotate: `${motion.value * 9}deg` }],
    opacity: 0.55 + motion.value * 0.45,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + motion.value * 0.1 }],
    opacity: 0.25 + motion.value * 0.3,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.passportCard}>
      <Animated.View style={[styles.passportGlow, glowStyle]} />
      <View style={styles.passportTopRow}>
        <View style={styles.passportTag}><View style={styles.passportTagDot} /><Text style={styles.passportTagText}>CAREER PASSPORT</Text></View>
        <Text style={styles.passportEdition}>9J / 01</Text>
      </View>
      <View style={styles.passportHero}>
        <View style={styles.passportMark}><Text style={styles.passportMarkText}>9</Text></View>
        <Animated.View style={[styles.orbitDot, orbitStyle]} />
        <View style={styles.passportCopy}>
          <Text style={styles.passportEyebrow}>YOUR NEXT MOVE</Text>
          <Text numberOfLines={1} style={styles.passportName}>{name.trim() || "Starts here"}</Text>
          <Text style={styles.passportDescription}>A focused profile built to match you with better-fit roles.</Text>
        </View>
      </View>
      <View style={styles.passportSteps}>
        {["IDENTITY", "PREFERENCES", "READY"].map((label, index) => (
          <View key={label} style={styles.passportStep}>
            <View style={[styles.passportStepLine, index === 0 && styles.passportStepLineActive]} />
            <Text style={[styles.passportStepText, index === 0 && styles.passportStepTextActive]}>{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

function DocumentButton({ label, required, file, onPress }: { label: string; required: boolean; file: QuestionnaireDocument | null; onPress: () => void }) {
  return (
    <Pressable style={[styles.documentButton, file && styles.documentSelected]} onPress={onPress}>
      <View style={styles.documentIcon}><Text style={styles.documentIconText}>{file ? "✓" : "+"}</Text></View>
      <View style={styles.documentCopy}>
        <Text style={styles.documentLabel}>{label}{required ? " *" : " (Optional)"}</Text>
        <Text numberOfLines={1} style={styles.documentName}>{file?.name || "Choose from device"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  ambientLayer: { position: "absolute", inset: 0, overflow: "hidden" },
  ambientWave: { position: "absolute", left: 0 },
  ambientParticles: { position: "absolute", inset: 0 },
  ambientParticle: { position: "absolute", backgroundColor: colors.accent },
  ambientParticleGlow: { boxShadow: `0 0 8px ${colors.accent}` },
  progressTrack: { height: 5, marginHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.border },
  progressFill: { height: 5, borderRadius: radii.pill, backgroundColor: colors.accent },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center" },
  backButtonHidden: { opacity: 0 },
  backText: { color: colors.surface, fontSize: 27, lineHeight: 30, fontWeight: "700" },
  stepChip: { backgroundColor: colors.dark, borderRadius: radii.pill, paddingHorizontal: 15, paddingVertical: 10 },
  stepChipText: { color: colors.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.7 },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  brandText: { ...typography.label, color: colors.mutedText, letterSpacing: 1.1 },
  title: { ...typography.display, color: colors.text, fontSize: 32, lineHeight: 39, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.mutedText, fontSize: 16, lineHeight: 23, marginBottom: spacing.sm },
  inputShell: { minHeight: 72, maxHeight: 150, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.dark, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center" },
  inputFilled: { borderColor: colors.accent },
  input: { flex: 1, minHeight: 72, maxHeight: 150, color: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 18, fontWeight: "600", textAlignVertical: "top" },
  filledBadge: { width: 28, height: 28, borderRadius: 14, marginRight: spacing.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  filledBadgeText: { color: colors.dark, fontSize: 15, fontWeight: "900" },
  dateField: { minHeight: 82, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.dark, backgroundColor: colors.dark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateLabel: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 5 },
  dateValue: { color: colors.surface, fontSize: 18, fontWeight: "700" },
  datePlaceholder: { color: colors.darkMuted },
  calendarIcon: { color: colors.accent, fontSize: 28, fontWeight: "700" },
  dateModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  dateModalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.dark, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: "#313724" },
  dateModalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#4B5045", alignSelf: "center", marginBottom: spacing.sm },
  dateModalEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  dateModalTitle: { color: colors.surface, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  dateModalSubtitle: { color: "#AEB2A8", fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  calendarCard: { borderRadius: 22, backgroundColor: "#151713", borderWidth: 1, borderColor: "#343A2C", padding: spacing.sm, gap: spacing.sm },
  calendarYearRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5 },
  calendarMiniButton: { minWidth: 42, height: 34, borderRadius: 12, borderWidth: 1, borderColor: "#3D4238", alignItems: "center", justifyContent: "center" },
  calendarMiniText: { color: colors.surface, fontSize: 11, fontWeight: "800", fontVariant: ["tabular-nums"] },
  calendarYear: { flex: 1, color: colors.accent, textAlign: "center", fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] },
  calendarMonthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarArrow: { width: 42, height: 38, borderRadius: 14, backgroundColor: "#25291F", alignItems: "center", justifyContent: "center" },
  calendarArrowText: { color: colors.accent, fontSize: 29, lineHeight: 31, fontWeight: "700" },
  calendarMonth: { color: colors.surface, fontSize: 18, fontWeight: "900" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarWeekDay: { width: "14.2857%", color: "#777C72", textAlign: "center", fontSize: 10, fontWeight: "900", paddingVertical: 5 },
  calendarDay: { width: "14.2857%", aspectRatio: 1.18, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  calendarDaySelected: { backgroundColor: colors.accent },
  calendarDayText: { color: colors.surface, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  calendarDayTextSelected: { color: colors.dark, fontWeight: "900" },
  dateModalActions: { flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  dateCancelButton: { minHeight: 54, flex: 1, borderRadius: radii.pill, borderWidth: 1, borderColor: "#41463C", alignItems: "center", justifyContent: "center" },
  dateCancelText: { color: colors.surface, fontSize: 15, fontWeight: "800" },
  dateConfirmButton: { minHeight: 54, flex: 1.5, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  dateConfirmText: { color: colors.dark, fontSize: 15, fontWeight: "900" },
  optionList: { gap: spacing.sm },
  option: { minHeight: 66, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionSelected: { backgroundColor: colors.dark, borderColor: colors.accent },
  optionText: { color: colors.text, fontSize: 17, fontWeight: "700" },
  optionTextSelected: { color: colors.surface },
  selectionCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong },
  selectionCircleSelected: { borderWidth: 6, borderColor: colors.accent, backgroundColor: colors.dark },
  documentList: { gap: spacing.md },
  documentButton: { minHeight: 84, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  documentSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceMuted },
  documentIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center" },
  documentIconText: { color: colors.accent, fontSize: 24, fontWeight: "800" },
  documentCopy: { flex: 1, gap: 4 },
  documentLabel: { color: colors.text, fontSize: 16, fontWeight: "800" },
  documentName: { color: colors.mutedText, fontSize: 13 },
  documentHint: { ...typography.label, color: colors.mutedText, lineHeight: 18 },
  error: { color: "#DC2626", fontSize: 13, fontWeight: "700" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.background },
  continueButton: { minHeight: 58, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: colors.dark, fontSize: 17, fontWeight: "900" },
  passportCard: { minHeight: 184, overflow: "hidden", borderRadius: 28, backgroundColor: colors.dark, padding: spacing.md, borderWidth: 1, borderColor: "#253100" },
  passportGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -34, top: 28, backgroundColor: colors.accent },
  passportTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passportTag: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: "#343A2C", paddingHorizontal: 9, paddingVertical: 6 },
  passportTagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  passportTagText: { color: colors.surface, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  passportEdition: { color: colors.darkMuted, fontSize: 10, fontWeight: "800", fontVariant: ["tabular-nums"] },
  passportHero: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  passportMark: { width: 60, height: 60, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  passportMarkText: { color: colors.dark, fontSize: 34, fontWeight: "900" },
  orbitDot: { position: "absolute", left: 48, top: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent },
  passportCopy: { flex: 1, gap: 2 },
  passportEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  passportName: { color: colors.surface, fontSize: 20, fontWeight: "900" },
  passportDescription: { color: "#B9BDB3", fontSize: 11, lineHeight: 15 },
  passportSteps: { flexDirection: "row", gap: 7 },
  passportStep: { flex: 1, gap: 5 },
  passportStepLine: { height: 3, borderRadius: radii.pill, backgroundColor: "#31342D" },
  passportStepLineActive: { backgroundColor: colors.accent },
  passportStepText: { color: "#656A60", fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  passportStepTextActive: { color: colors.surface },
});
