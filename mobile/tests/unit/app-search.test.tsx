import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SearchScreen from "@/app/(app)/jobs/search";
import { useJobFilters } from "@/features/jobs/useJobFilters";
import { router } from "expo-router";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({ query: "hired" }) }));
jest.mock("@/features/jobs/hooks", () => ({ useJobsQuery: () => ({ data: [] }), useToggleSaveMutation: () => ({ mutate: jest.fn() }) }));
jest.mock("@/components/premium/PremiumScaffold", () => ({ PremiumScaffold: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/components/ui/AppIcon", () => ({ AppIcon: () => null }));
jest.mock("@/components/ui/JobCard", () => ({ JobCard: () => null }));
jest.mock("@/components/motion/AnimatedPressable", () => ({ AnimatedPressable: require("react-native").Pressable }));

beforeEach(() => { useJobFilters.getState().reset(); jest.clearAllMocks(); });

it("lets a user replace a route-provided query without resetting their typing", async () => {
  const view = await render(<SearchScreen />);
  const input = view.getByLabelText("Search jobs and app sections");
  expect(input.props.value).toBe("hired");
  await fireEvent.changeText(input, "pricing");
  expect(view.getByLabelText("Search jobs and app sections").props.value).toBe("pricing");
  expect(view.queryByText("No roles found")).toBeNull();
  await fireEvent.press(view.getByLabelText("Open Pricing & Plans"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/(app)/pricing" });
});

it("shows email features together and opens the selected tracker filter", async () => {
  const view = await render(<SearchScreen />);
  await fireEvent.changeText(view.getByLabelText("Search jobs and app sections"), "email");
  expect(view.getByText("Hiring Manager Outreach")).toBeTruthy();
  await fireEvent.press(view.getByLabelText("Open Cold Emails Sent"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/(app)/tracker-details", params: { filter: "Cold Emails Sent" } });
});
