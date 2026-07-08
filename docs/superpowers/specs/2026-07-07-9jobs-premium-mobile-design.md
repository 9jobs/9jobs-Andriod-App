# 9Jobs Premium Mobile Design

## Goal

Rebuild the existing Expo mobile app into a premium, Figma-aligned experience that covers all requested public and app screens with a usable demo flow, shared visual system, and emulator-ready navigation.

## Scope

The implementation covers these screens:

- Splash
- Onboarding
- Login
- Signup
- Home
- Services
- Tracker
- Resume
- Outreach
- Interview
- Pricing
- Stories
- Notifications
- Messages
- Profile
- Settings
- About
- Contact

The experience should be visually consistent with the provided premium mockups: dark hero surfaces, off-white app background, neon green actions, soft rounded cards, compact metrics, and mobile-first spacing.

## Architecture

The app will keep the existing Expo Router structure and session bootstrap, but move most UI composition into a shared premium component layer. Public screens will remain under `mobile/app/(public)`, authenticated screens under `mobile/app/(app)`, and secondary screens will use stack navigation inside the app group.

Reusable presentation concerns will live in shared components and screen descriptors rather than duplicating per-screen styling. Demo content will come from local configuration objects so flows can be navigated and previewed without backend work.

## Navigation

### Public flow

- `mobile/app/index.tsx` remains the splash entry and redirects based on onboarding/auth state.
- `mobile/app/(public)/index.tsx` remains onboarding.
- `mobile/app/(public)/auth/index.tsx` becomes the combined login/signup screen with usable mode switching.

### Authenticated flow

Primary bottom tabs:

- Home
- Services
- Tracker
- Messages
- Profile

Secondary routes reachable from tabs and CTAs:

- Resume
- Outreach
- Interview
- Pricing
- Stories
- Notifications
- Settings
- About
- Contact

## Screen Behavior

- Splash auto-redirects after boot and visually matches the black premium launch screen.
- Onboarding keeps a multi-step flow with usable continue/skip controls.
- Auth screen supports real Clerk auth when configured and a clear local fallback when not configured.
- Home exposes stats, quick actions, recommended jobs, and entry points into secondary flows.
- Secondary screens use demo but meaningful state and navigation, not dead mock cards.
- Profile links into settings, about, and contact.

## Shared UI System

The design system needs:

- premium palette tokens
- mobile spacing and radius scale
- typography tuned for card-heavy layouts
- shared header/search/stat tile/action card/list row components
- a reusable scaffold for tab screens and secondary detail screens

## Data Strategy

Use local mock content for premium cards, stories, notifications, message threads, service items, and resume/interview/outreach states. Existing demo job/profile content should be reused where practical, with additional static datasets added only where the route needs dedicated content.

## Error Handling

- Missing Clerk configuration must still allow design review via the local fallback card.
- Navigation targets should always resolve; no CTA should push to a missing route.
- Screens should degrade gracefully when optional user/job data is absent.

## Testing

- Extend or add unit tests for routing helpers and any extracted screen data logic.
- Run the existing mobile Jest suite after implementation.
- Launch Expo and verify the app in the Android emulator, ensuring the redesigned flows render and navigation works.
