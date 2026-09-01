import React from "react";
import renderer, { act } from "react-test-renderer";
import { buildMessageThread, buildTrackerSummaryFromApplications, buildUserHomeMetrics } from "@/lib/data/live-sync";

let mockCurrentSnapshot: any;
const mockListeners = new Set<() => void>();

function setSnapshot(nextSnapshot: any) {
  mockCurrentSnapshot = nextSnapshot;
  mockListeners.forEach((listener) => listener());
}

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

jest.mock("@/components/ui/Screen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("@/components/motion/FadeInView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FadeInView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("@/components/motion/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    AnimatedPressable: ({ children, ...props }: any) => <Pressable {...props}>{children}</Pressable>,
  };
});

jest.mock("@/components/motion/card-floating-particles", () => ({
  CardFloatingParticles: () => null,
}));

jest.mock("@/components/motion/rocket-launch-glow", () => ({
  RocketLaunchGlow: () => null,
}));

jest.mock("@/components/resume/ResumeDataTransferSpline", () => ({
  ResumeDataTransferSpline: () => null,
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("@/providers/SessionProvider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Test User",
    },
    signOut: jest.fn(),
    hasCompletedOnboarding: true,
  }),
}));

jest.mock("@/features/jobs/useJobFilters", () => ({
  useJobFilters: () => ({
    setQuery: jest.fn(),
  }),
}));

jest.mock("@/features/jobs/hooks", () => ({
  useUpdateProfileMutation: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useUploadResumeMutation: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/features/mobile-sync/hooks", () => {
  const React = require("react");
  const useSharedPreviewSync = (_enableRealtime?: boolean, options?: { select?: (snapshot: any) => any }) => {
      const data = React.useSyncExternalStore(
        (listener: () => void) => {
          mockListeners.add(listener);
          return () => mockListeners.delete(listener);
        },
        () => (options?.select ? options.select(mockCurrentSnapshot) : mockCurrentSnapshot),
        () => (options?.select ? options.select(mockCurrentSnapshot) : mockCurrentSnapshot),
      );

      return {
        data,
        isLoading: false,
        isRefetching: false,
        isError: false,
        refetch: jest.fn(),
      };
    };
  return {
    usePreviewSyncQuery: useSharedPreviewSync,
    usePreviewSyncSelector: (selector: (snapshot: any) => any, enableRealtime?: boolean, options?: Record<string, unknown>) =>
      useSharedPreviewSync(enableRealtime, { ...options, select: selector }),
  };
});

function buildBenchmarkSnapshot() {
  const now = new Date("2026-08-24T12:00:00.000Z").toISOString();
  const applications = Array.from({ length: 800 }, (_, index) => ({
    id: index + 1,
    user_id: "user-1",
    client_id: "user-1",
    job_id: `job-${index + 1}`,
    status:
      index % 9 === 0
        ? "interview_scheduled"
        : index % 7 === 0
          ? "offer_received"
          : index % 5 === 0
            ? "recruiter_contacted"
            : "applied",
    current_stage: index % 11 === 0 ? "shortlisted" : "applied",
    application_date: now,
    applied_at: now,
    created_at: now,
    recruiter_email: `recruiter-${index}@example.com`,
    hiring_manager_email: `manager-${index}@example.com`,
  }));

  const trackerInterviews = Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    application_id: index + 1,
    interview_date: now,
    status: index % 2 === 0 ? "scheduled" : "completed",
    interview_type: "Video",
    interview_round: "Round 1",
  }));

  const trackerFollowUps = Array.from({ length: 200 }, (_, index) => ({
    id: index + 1,
    application_id: index + 1,
    due_date: now,
    completed_at: null,
    status: "pending",
  }));

  const trackerRecruiterContacts = Array.from({ length: 300 }, (_, index) => ({
    id: index + 1,
    application_id: (index % applications.length) + 1,
    email: `contact-${index}@example.com`,
    contact_date: now,
    response_status: index % 4 === 0 ? "replied" : "no_response",
    recruiter_name: `Recruiter ${index}`,
  }));

  const trackerColdEmails = Array.from({ length: 250 }, (_, index) => ({
    id: index + 1,
    sent_at: now,
    delivery_status: index % 6 === 0 ? "failed" : "sent",
  }));

  const clientScores = Array.from({ length: 250 }, (_, index) => ({
    id: index + 1,
    application_id: (index % applications.length) + 1,
    ai_match_score: 60 + (index % 35),
    ats_score: 55 + (index % 40),
    calculated_at: now,
  }));

  const messages = Array.from({ length: 300 }, (_, index) => ({
    id: index + 1,
    conversation_id: "admin-thread",
    sender_id: index % 2 === 0 ? "admin" : "user-1",
    sender_role: index % 2 === 0 ? "admin" : "client",
    content: `Message ${index + 1}`,
    text: `Message ${index + 1}`,
    status: index % 3 === 0 ? "sent" : "seen",
    created_at: new Date(Date.now() - index * 60_000).toISOString(),
  }));

  return {
    profile: {
      id: "user-1",
      fullName: "Test User",
      darkMode: false,
      weeklyGoal: "10",
      pushNotifications: true,
      avatarUrl: "https://example.com/avatar.png",
      linkedinUrl: "",
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
    },
    systemSettings: {
      darkModeOverride: false,
      pushNotificationsEnabled: true,
    },
    homeMetrics: {
      totalApplications: 800,
      todayApplied: 30,
      interviewing: 55,
      offers: 12,
      resumeScore: 91,
    },
    trackerSummary: {
      atsResumeScore: 91,
      aiMatchScore: 88,
    },
    pricingContent: {
      sections: [
        {
          items: [{ title: "Pro Candidate", badge: "Active" }],
        },
      ],
    },
    notifications: [
      { id: 1, title: "Interview", body: "Upcoming interview", unread: true, sentAt: now, status: "unread" },
    ],
    trackerInterviews,
    trackerFollowUps,
    trackerRecruiterContacts,
    trackerColdEmails,
    clientScores,
    rawApplications: applications,
    messageThread: {
      id: "admin-thread",
      name: "9Jobs Admin",
      role: "Support",
      snippet: "Latest reply",
      time: now,
      unreadCount: 3,
    },
    services: [
      {
        id: "resume",
        title: "Resume Intelligence",
        subtitle: "AI scoring",
        icon: "resume",
        route: "/(app)/resume",
        badge: "AI",
        isIconDark: true,
      },
    ],
    outreachContacts: [
      {
        id: 1,
        name: "Hiring Manager",
        email: "hm@example.com",
        position: "Director",
        profileLink: "https://example.com",
      },
    ],
    resumeAnalysis: {
      keywords: 80,
      formatting: 82,
      experience: 85,
      impactVerbs: 88,
      atsScore: 91,
      roleSpecificScore: 86,
      missingKeywords: [],
      skillGapAnalysis: [],
      formattingIssues: [],
      grammarSuggestions: [],
      achievementRewriting: [],
      resumeVersionComparison: "",
      jobDescriptionCompatibility: 80,
      recruiterReadabilityScore: 90,
      australianResumeComplianceCheck: { compliant: true, issues: [] },
    },
    coverLetter: {
      content: "Cover letter",
    },
    messages,
  };
}

describe("performance benchmark", () => {
  it("reports live-sync computation timings", () => {
    const snapshot = buildBenchmarkSnapshot();

    const runs = 120;
    const homeStart = performance.now();
    for (let index = 0; index < runs; index++) {
      buildUserHomeMetrics(snapshot.rawApplications, 91, "2026-08-24T12:00:00.000Z");
    }
    const homeDuration = performance.now() - homeStart;

    const trackerStart = performance.now();
    for (let index = 0; index < runs; index++) {
      buildTrackerSummaryFromApplications(snapshot.rawApplications, 40, 91, "2026-08-24T12:00:00.000Z", {
        interviews: snapshot.trackerInterviews,
        followUps: snapshot.trackerFollowUps,
        recruiterContacts: snapshot.trackerRecruiterContacts,
        coldEmails: snapshot.trackerColdEmails,
        scores: snapshot.clientScores,
      });
    }
    const trackerDuration = performance.now() - trackerStart;

    const messageStart = performance.now();
    for (let index = 0; index < runs; index++) {
      buildMessageThread(snapshot.messages, snapshot.profile.fullName);
    }
    const messageDuration = performance.now() - messageStart;

    console.log(
      JSON.stringify(
        {
          benchmark: "live-sync-functions",
          runs,
          avgHomeMetricsMs: Number((homeDuration / runs).toFixed(3)),
          avgTrackerSummaryMs: Number((trackerDuration / runs).toFixed(3)),
          avgMessageThreadMs: Number((messageDuration / runs).toFixed(3)),
        },
        null,
        2,
      ),
    );
  });

  it("reports rerender counts for unrelated preview-sync updates", () => {
    const HomeScreen = require("@/app/(app)/index").default;
    const MessagesScreen = require("@/app/(app)/messages").default;
    const ServicesScreen = require("@/app/(app)/services").default;
    const SettingsScreen = require("@/app/(app)/settings").default;

    const baseSnapshot = buildBenchmarkSnapshot();
    setSnapshot(baseSnapshot);

    const renderCounts = {
      home: 0,
      messages: 0,
      services: 0,
      settings: 0,
    };

    function trackRender(name: keyof typeof renderCounts) {
      renderCounts[name] += 1;
    }

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <>
          <React.Profiler id="home" onRender={() => trackRender("home")}>
            <HomeScreen />
          </React.Profiler>
          <React.Profiler id="messages" onRender={() => trackRender("messages")}>
            <MessagesScreen />
          </React.Profiler>
          <React.Profiler id="services" onRender={() => trackRender("services")}>
            <ServicesScreen />
          </React.Profiler>
          <React.Profiler id="settings" onRender={() => trackRender("settings")}>
            <SettingsScreen />
          </React.Profiler>
        </>,
      );
    });

    act(() => {
      setSnapshot({
        ...baseSnapshot,
        trackerSummary: {
          ...baseSnapshot.trackerSummary,
          atsResumeScore: 95,
        },
      });
    });

    act(() => {
      tree!.unmount();
    });

    console.log(
      JSON.stringify(
        {
          benchmark: "preview-sync-rerenders",
          update: "tracker-summary-only",
          renderCounts,
        },
        null,
        2,
      ),
    );
  });
});
