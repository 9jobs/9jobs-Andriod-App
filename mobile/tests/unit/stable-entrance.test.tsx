import React from "react";
import { render } from "@testing-library/react-native";
import { Animated, Text } from "react-native";
import { StableEntranceView } from "@/components/motion/StableEntranceView";

jest.mock("@/components/motion/ReducedMotion", () => ({ useReducedMotionPreference: jest.fn(() => false) }));

it("reveals content once with the native driver without waiting for scroll measurements", async () => {
  const timing = jest.spyOn(Animated, "timing").mockImplementation((value, config) => {
    if (typeof config.toValue === "number") (value as Animated.Value).setValue(config.toValue);
    return { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  });
  try {
    const view = await render(<StableEntranceView direction="left"><Text>Long section</Text></StableEntranceView>);
    expect(timing).toHaveBeenCalledWith(expect.any(Animated.Value), expect.objectContaining({ toValue: 1, useNativeDriver: true }));
    await view.rerender(<StableEntranceView direction="left"><Text>Refreshed section</Text></StableEntranceView>);
    expect(timing).toHaveBeenCalledTimes(1);
  } finally {
    timing.mockRestore();
  }
});

it("keeps content visible and skips motion when accessibility requests reduced motion", async () => {
  const reduced = require("@/components/motion/ReducedMotion").useReducedMotionPreference;
  reduced.mockReturnValue(true);
  const timing = jest.spyOn(Animated, "timing");
  try {
    const view = await render(<StableEntranceView direction="up"><Text>Accessible content</Text></StableEntranceView>);
    expect(view.getByText("Accessible content")).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
  } finally {
    reduced.mockReturnValue(false);
    timing.mockRestore();
  }
});
