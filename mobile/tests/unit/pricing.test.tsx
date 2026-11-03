import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import PricingScreen from "@/app/(app)/pricing";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock("expo-linking", () => ({ createURL: () => "ninejobs://pricing", parse: jest.fn() }));
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn(async () => ({ type: "cancel" })) }));
jest.mock("@/components/ui/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ checkoutUrl: "https://checkout.stripe.com/fixture" }) })) as jest.Mock;
});

it("shows reference names, prices, GST and services without editable payment amounts", async () => {
  const view = await render(<PricingScreen />);
  for (const text of ["Choose Your Plan", "Trial Plan", "Standard Plan", "Premium Plan", "AUD $149", "AUD $1,499", "AUD $89", "Resume, LinkedIn & SEEK Optimisation", "100+ targeted job applications every week", "10 interview opportunities target", "Just A$1.49 per application (before GST)"]) {
    expect(view.getByText(text)).toBeTruthy();
  }
  expect(view.getAllByText("AUD $49")).toHaveLength(2);
  expect(view.getAllByText("+ 10% GST")).toHaveLength(5);
  expect(view.queryByText("Non-IT")).toBeNull();
  expect(view.queryByPlaceholderText("Enter amount")).toBeNull();
});

it("each Pay Now opens checkout for its own exact plan without a client-supplied amount", async () => {
  const view = await render(<PricingScreen />);
  for (const [title, planId] of [["Trial Plan","trial"],["Standard Plan","standard"],["Premium Plan","premium"],["Resume Makeover","resume-makeover"],["Resume, LinkedIn & SEEK Optimisation","resume-linkedin-seek"]]) {
    await fireEvent.press(view.getByLabelText(`Pay for ${title}`));
    const options = (globalThis.fetch as jest.Mock).mock.calls.at(-1)![1];
    expect(JSON.parse(options.body)).toEqual({ planId });
  }
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledTimes(5);
});

it("keeps scheduling navigation working and reports a checkout error", async () => {
  const view = await render(<PricingScreen />);
  await fireEvent.press(view.getAllByText("Get a schedule")[0]);
  expect(router.push).toHaveBeenCalledWith("/(app)/contact");
  jest.spyOn(Alert,"alert").mockImplementation(() => {});
  (globalThis.fetch as jest.Mock).mockResolvedValue({ ok:false,json:async () => ({error:"Checkout unavailable"}) });
  await fireEvent.press(view.getByLabelText("Pay for Standard Plan"));
  expect(Alert.alert).toHaveBeenCalledWith("Payment failed","Checkout unavailable");
});
