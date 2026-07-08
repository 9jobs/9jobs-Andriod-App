# 9Jobs Premium Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Figma-aligned premium 9Jobs mobile experience across all requested screens with usable navigation and emulator-ready Expo rendering.

**Architecture:** Keep Expo Router and session bootstrap intact, introduce a shared premium screen/component layer, then rebuild public and authenticated screens around route-specific content definitions. Use bottom tabs for primary destinations and stack routes for secondary pages so the flow stays navigable without duplicating layout code.

**Tech Stack:** Expo 57, Expo Router, React Native, TypeScript, Clerk Expo, Jest

---

## File Structure

- Modify: `mobile/theme/index.ts`
- Modify: `mobile/app/_layout.tsx`
- Modify: `mobile/app/index.tsx`
- Modify: `mobile/app/(public)/index.tsx`
- Modify: `mobile/app/(public)/auth/index.tsx`
- Modify: `mobile/app/(app)/_layout.tsx`
- Modify: `mobile/app/(app)/index.tsx`
- Modify: `mobile/app/(app)/tracker.tsx`
- Modify: `mobile/app/(app)/profile/index.tsx`
- Modify: `mobile/app/(app)/jobs/search.tsx`
- Modify: `mobile/app/(app)/jobs/[id].tsx`
- Modify: `mobile/features/auth/AuthCard.tsx`
- Modify: `mobile/tests/unit/onboarding.test.ts`
- Create: `mobile/app/(app)/services.tsx`
- Create: `mobile/app/(app)/messages.tsx`
- Create: `mobile/app/(app)/resume.tsx`
- Create: `mobile/app/(app)/outreach.tsx`
- Create: `mobile/app/(app)/interview.tsx`
- Create: `mobile/app/(app)/pricing.tsx`
- Create: `mobile/app/(app)/stories.tsx`
- Create: `mobile/app/(app)/notifications.tsx`
- Create: `mobile/app/(app)/settings.tsx`
- Create: `mobile/app/(app)/about.tsx`
- Create: `mobile/app/(app)/contact.tsx`
- Create: `mobile/components/premium/*`
- Create: `mobile/lib/data/premium-content.ts`
- Create: `mobile/tests/unit/premium-content.test.ts`

### Task 1: Shared Premium Foundation

**Files:**
- Modify: `mobile/theme/index.ts`
- Create: `mobile/components/premium/*`

- [ ] Write failing tests for any extracted route/content helpers in `mobile/tests/unit/premium-content.test.ts`
- [ ] Run `npm test -- premium-content.test.ts` from `mobile`
- [ ] Expand theme tokens and add reusable premium screen components
- [ ] Re-run `npm test -- premium-content.test.ts`

### Task 2: Public Flow Redesign

**Files:**
- Modify: `mobile/app/index.tsx`
- Modify: `mobile/app/(public)/index.tsx`
- Modify: `mobile/app/(public)/auth/index.tsx`
- Modify: `mobile/features/auth/AuthCard.tsx`

- [ ] Write failing tests for any changed onboarding routing/content helpers
- [ ] Run `npm test -- onboarding.test.ts`
- [ ] Rebuild splash, onboarding, and auth screens on the premium scaffold
- [ ] Re-run `npm test -- onboarding.test.ts`

### Task 3: Primary App Navigation

**Files:**
- Modify: `mobile/app/(app)/_layout.tsx`
- Modify: `mobile/app/(app)/index.tsx`
- Create: `mobile/app/(app)/services.tsx`
- Modify: `mobile/app/(app)/tracker.tsx`
- Create: `mobile/app/(app)/messages.tsx`
- Modify: `mobile/app/(app)/profile/index.tsx`
- Create: `mobile/lib/data/premium-content.ts`

- [ ] Write failing tests for premium content helpers and route-driven screen data
- [ ] Run `npm test -- premium-content.test.ts`
- [ ] Implement tab navigation and primary tab screens
- [ ] Re-run `npm test -- premium-content.test.ts`

### Task 4: Secondary Premium Screens

**Files:**
- Create: `mobile/app/(app)/resume.tsx`
- Create: `mobile/app/(app)/outreach.tsx`
- Create: `mobile/app/(app)/interview.tsx`
- Create: `mobile/app/(app)/pricing.tsx`
- Create: `mobile/app/(app)/stories.tsx`
- Create: `mobile/app/(app)/notifications.tsx`
- Create: `mobile/app/(app)/settings.tsx`
- Create: `mobile/app/(app)/about.tsx`
- Create: `mobile/app/(app)/contact.tsx`

- [ ] Write failing tests for any shared selector/formatter used by these screens
- [ ] Run `npm test -- premium-content.test.ts`
- [ ] Implement the remaining premium stack screens with live navigation
- [ ] Re-run `npm test -- premium-content.test.ts`

### Task 5: Search and Job Detail Harmonization

**Files:**
- Modify: `mobile/app/(app)/jobs/search.tsx`
- Modify: `mobile/app/(app)/jobs/[id].tsx`
- Modify: `mobile/app/(app)/saved.tsx`

- [ ] Add failing tests if search/detail helper behavior changes
- [ ] Run relevant targeted Jest tests
- [ ] Restyle search, saved, and job detail flows to match the premium system
- [ ] Re-run targeted Jest tests

### Task 6: Final Verification

**Files:**
- Modify as needed based on verification results

- [ ] Run `npm test`
- [ ] Start Expo with Android target
- [ ] Verify navigation and rendering in the emulator
- [ ] Fix any regressions and re-run verification
