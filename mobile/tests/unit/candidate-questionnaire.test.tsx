import TestRenderer, { act } from "react-test-renderer";
import CandidateQuestionnaireScreen from "@/app/questionnaire";

jest.mock("react-native-reanimated", () => {
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: { Text, View },
    Easing: { inOut: (value: unknown) => value, quad: "quad" },
    FadeInDown: { duration: () => ({}) },
    FadeInUp: { duration: () => ({ delay: () => ({}) }) },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Circle: View,
    Path: View,
  };
});

jest.mock("expo-router", () => ({
  Redirect: () => null,
  router: { replace: jest.fn() },
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 24, left: 0 }),
}));

jest.mock("@/providers/SessionProvider", () => ({
  useSession: () => ({
    user: {
      id: "questionnaire-test-user",
      email: "candidate@example.com",
      fullName: "Test Candidate",
      phoneNumber: "",
    },
    hasCompletedOnboarding: false,
    setOnboardingComplete: jest.fn(),
  }),
}));

jest.mock("@/lib/data/candidate-questionnaire", () => ({
  submitCandidateQuestionnaire: jest.fn(),
  uploadQuestionnaireDocument: jest.fn(),
}));

describe("CandidateQuestionnaireScreen", () => {
  test("renders the themed first question and advances after a valid answer", async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<CandidateQuestionnaireScreen />);
    });

    expect(tree.root.findByProps({ children: "Hello! Let’s start with your full name." })).toBeTruthy();
    const hasText = (value: string) => tree.root.findAll((node) => {
      const children = node.props.children;
      return Array.isArray(children) && children.join("") === value;
    }).length > 0;
    expect(hasText("1 / 12")).toBe(true);

    await act(async () => {
      tree.root.findByProps({ placeholder: "Your full name" }).props.onChangeText("Hemant Sharma");
    });
    await act(async () => {
      const pressables = tree.root.findAll((node) => typeof node.props.onPress === "function");
      pressables[pressables.length - 1].props.onPress();
    });

    expect(tree.root.findByProps({ children: "Where can the right opportunity reach you?" })).toBeTruthy();
    expect(hasText("2 / 12")).toBe(true);
  });
});
