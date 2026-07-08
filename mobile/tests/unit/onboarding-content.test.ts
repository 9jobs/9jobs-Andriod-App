import { onboardingSlides } from "@/features/onboarding/content";

describe("onboardingSlides", () => {
  test("exposes clean CTA labels without arrow artifacts", () => {
    expect(onboardingSlides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "resume",
          ctaLabel: "Continue",
        }),
        expect.objectContaining({
          id: "outreach",
          ctaLabel: "Keep going",
        }),
        expect.objectContaining({
          id: "interview",
          ctaLabel: "Start now",
        }),
      ]),
    );
  });
});
