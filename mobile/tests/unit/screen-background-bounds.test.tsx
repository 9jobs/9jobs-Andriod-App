import React from "react";
import { Text } from "react-native";
import { render, within } from "@testing-library/react-native";
import { Screen } from "@/components/ui/Screen";

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(), usePathname: () => "/tracker", useSegments: () => ["(app)"],
}));
jest.mock("@/theme", () => ({ colors: { background: "#fff" }, spacing: { lg: 20 }, useThemeVersion: jest.fn() }));
jest.mock("@/components/ui/AppHeader", () => ({ AppHeader: () => null }));
jest.mock("@/components/motion/screen-background", () => {
  const React = require("react"); const { View } = require("react-native");
  return { ScreenBackground: () => React.createElement(View, { testID: "screen-background" }) };
});
jest.mock("@/components/ui/SmoothScrollView", () => {
  const React = require("react"); const { View } = require("react-native");
  return { SmoothScrollView: ({ children, ...props }: any) => React.createElement(View, { ...props, testID: "native-scroller" }, children) };
});

it("keeps the SVG backdrop outside a long native scroller without removing any records", async () => {
  const view = await render(<Screen>{Array.from({ length: 72 }, (_, index) => <Text key={index}>Source row {index + 1}</Text>)}</Screen>);
  const scroll = view.getByTestId("native-scroller");
  expect(view.getByTestId("screen-background")).toBeTruthy();
  expect(within(scroll).queryByTestId("screen-background")).toBeNull();
  expect(view.getByText("Source row 1")).toBeTruthy();
  expect(view.getByText("Source row 72")).toBeTruthy();
  expect(within(scroll).getAllByText(/^Source row /)).toHaveLength(72);
});
