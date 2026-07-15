import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { previewAdminCredentials, resolveAdminAccess, validatePreviewAdminLogin } from "./lib/adminAuth";
import { calculateTrackerMetrics } from "./lib/trackerMetrics";
import { parseHiringManagersCsv } from "./lib/hiringManagers";
import { io } from "socket.io-client";

let adminSocket: any = null;
const BACKEND_URL = "http://localhost:3000";
const previewTrackerClient = {
  id: "preview-user-9jobs",
  full_name: "Test User",
  email: "preview-user-9jobs@9jobs.app",
  phone_number: "",
  timezone: "Australia/Melbourne",
  role: "client",
};

const SUCCESS_STORIES_LOCAL_KEY = "admin_success_stories_preview";

const previewTrackerJobs = [
  {
    id: "job_resume_lead",
    title: "AI Resume Lead",
    company: "Northstar Careers",
    location: "Remote",
    salary: "$72k - $90k",
    job_type: "Full-time",
    posted_at: "2h ago",
    match_score: 97,
    tags: ["React", "Node", "UX"],
    description: "Own resume optimization workflows, benchmark ATS scores, and guide premium candidates through high-conversion application strategy.",
  },
  {
    id: "job_growth_specialist",
    title: "Job Search Growth Specialist",
    company: "Greenline Talent",
    location: "Dubai",
    salary: "$64k - $78k",
    job_type: "Full-time",
    posted_at: "5h ago",
    match_score: 92,
    tags: ["Growth", "CRM", "Outreach"],
    description: "Build outreach loops, refine messaging, and grow premium applicant funnels across technical and operations roles.",
  },
  {
    id: "job_interview_coach",
    title: "Interview Intelligence Coach",
    company: "Vertex Hiring Lab",
    location: "Bangalore",
    salary: "$55k - $70k",
    job_type: "Full-time",
    posted_at: "1d ago",
    match_score: 88,
    tags: ["Coaching", "Audio", "Prep"],
    description: "Deliver mock interview loops and personalized prep experiences for top-tier candidates targeting global companies.",
  },
] as const;

const australianLocationOptions = [
  "Remote - Australia",
  "New South Wales",
  "Sydney, NSW",
  "Newcastle, NSW",
  "Wollongong, NSW",
  "Central Coast, NSW",
  "Maitland, NSW",
  "Coffs Harbour, NSW",
  "Wagga Wagga, NSW",
  "Albury, NSW",
  "Orange, NSW",
  "Dubbo, NSW",
  "Victoria",
  "Melbourne, VIC",
  "Geelong, VIC",
  "Ballarat, VIC",
  "Bendigo, VIC",
  "Shepparton, VIC",
  "Mildura, VIC",
  "Warrnambool, VIC",
  "Queensland",
  "Brisbane, QLD",
  "Gold Coast, QLD",
  "Sunshine Coast, QLD",
  "Townsville, QLD",
  "Cairns, QLD",
  "Toowoomba, QLD",
  "Mackay, QLD",
  "Rockhampton, QLD",
  "Bundaberg, QLD",
  "South Australia",
  "Adelaide, SA",
  "Mount Gambier, SA",
  "Whyalla, SA",
  "Murray Bridge, SA",
  "Port Lincoln, SA",
  "Western Australia",
  "Perth, WA",
  "Fremantle, WA",
  "Mandurah, WA",
  "Bunbury, WA",
  "Geraldton, WA",
  "Albany, WA",
  "Kalgoorlie, WA",
  "Tasmania",
  "Hobart, TAS",
  "Launceston, TAS",
  "Devonport, TAS",
  "Burnie, TAS",
  "Northern Territory",
  "Darwin, NT",
  "Alice Springs, NT",
  "Palmerston, NT",
  "Australian Capital Territory",
  "Canberra, ACT",
] as const;

function getAustraliaLocationOptions(currentLocation?: string) {
  if (!currentLocation?.trim()) {
    return australianLocationOptions;
  }

  return australianLocationOptions.includes(currentLocation as (typeof australianLocationOptions)[number])
    ? australianLocationOptions
    : [currentLocation, ...australianLocationOptions];
}

function readLocalSuccessStories() {
  try {
    const raw = localStorage.getItem(SUCCESS_STORIES_LOCAL_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSuccessStories(stories: any[]) {
  localStorage.setItem(SUCCESS_STORIES_LOCAL_KEY, JSON.stringify(stories));
}

async function createCompressedImageDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result) {
        reject(new Error("Could not read selected image from device."));
        return;
      }

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 160;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Could not process selected image."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.55));
      };
      image.onerror = () => reject(new Error("Could not process selected image."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read selected image from device."));
    reader.readAsDataURL(file);
  });
}

function upsertLocalSuccessStoryRecord(story: any) {
  const current = readLocalSuccessStories();
  const nextStory = {
    ...story,
    id: story.id || `story_${Math.random().toString(36).slice(2, 10)}`,
    updated_at: new Date().toISOString(),
    created_at: story.created_at || new Date().toISOString(),
  };
  const existingIndex = current.findIndex((item: any) => item.id === nextStory.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...nextStory };
  } else {
    current.push(nextStory);
  }

  current.sort((left: any, right: any) => {
    const leftOrder = Number(left.display_order ?? 0);
    const rightOrder = Number(right.display_order ?? 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });

  try {
    writeLocalSuccessStories(current);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error("Could not save story locally.");
    const isQuotaError =
      normalizedError.name === "QuotaExceededError" ||
      normalizedError.message.toLowerCase().includes("quota");

    if (!isQuotaError) {
      throw normalizedError;
    }

    const trimmedStories = current.map((item: any) => ({
      ...item,
      photo_url: typeof item.photo_url === "string" && item.photo_url.startsWith("data:") ? "" : item.photo_url,
    }));

    writeLocalSuccessStories(trimmedStories);
  }

  return nextStory;
}

function deleteLocalSuccessStoryRecord(id: string) {
  const current = readLocalSuccessStories();
  const next = current.filter((item: any) => item.id !== id);
  writeLocalSuccessStories(next);
}

async function syncLocalSuccessStoriesToBackend(
  stories: any[],
  ensureAdminTokenFn: () => Promise<string | null>,
) {
  if (stories.length === 0) {
    return [];
  }

  const token = await ensureAdminTokenFn();
  if (!token) {
    throw new Error("Admin auth token missing. Please sign in again.");
  }

  const syncedStories: any[] = [];
  for (const story of stories) {
    const response = await fetch(`${BACKEND_URL}/api/admin/success-stories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ story }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
    }

    const payload = await response.json();
    syncedStories.push(payload.story ?? story);
  }

  writeLocalSuccessStories([]);
  return syncedStories;
}

function connectAdminSocket(token: string, onEvent: (event: string, payload: any) => void) {
  if (adminSocket) {
    adminSocket.disconnect();
  }

  console.log("[Admin Socket] Connecting to Socket.IO server at:", BACKEND_URL);
  adminSocket = io(BACKEND_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  adminSocket.on("connect", () => {
    console.log("[Admin Socket] Connected successfully. Socket ID:", adminSocket.id);
    adminSocket.emit("join_conversation", "admins");
  });

  adminSocket.on("connect_error", (err: any) => {
    console.error("[Admin Socket] Connect error:", err.message);
  });

  adminSocket.on("conversation_created", (data: any) => {
    onEvent("conversation_created", data);
  });

  adminSocket.on("conversation_updated", (data: any) => {
    onEvent("conversation_updated", data);
  });

  adminSocket.on("new_message", (data: any) => {
    onEvent("new_message", data);
  });

  adminSocket.on("message_seen", (data: any) => {
    onEvent("message_seen", data);
  });

  adminSocket.on("message_delivered", (data: any) => {
    onEvent("message_delivered", data);
  });

  adminSocket.on("unread_count_updated", (data: any) => {
    onEvent("unread_count_updated", data);
  });
}

function mergePreviewJobs(existingJobs: any[]) {
  const jobMap = new Map<string, any>();
  for (const job of existingJobs) {
    jobMap.set(job.id, job);
  }
  for (const job of previewTrackerJobs) {
    if (!jobMap.has(job.id)) {
      jobMap.set(job.id, job);
    }
  }
  return Array.from(jobMap.values());
}

function disconnectAdminSocket() {
  if (adminSocket) {
    console.log("[Admin Socket] Disconnecting socket.");
    adminSocket.disconnect();
    adminSocket = null;
  }
}

import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  MessageSquare,
  Sparkles,
  DollarSign,
  Bell,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  LogOut,
  Send,
  User,
  Shield,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Star
} from "lucide-react";

import { useUser, useAuth, useSignIn } from "@clerk/clerk-react";

// Tab types
type Tab =
  | "dashboard"
  | "users"
  | "jobs"
  | "saved_jobs"
  | "success_stories"
  | "applications"
  | "job_tracker"
  | "hiring_managers"
  | "interview_preparation"
  | "messages"
  | "services"
  | "resume_ai"
  | "subscriptions"
  | "notifications"
  | "settings";

const applicationStatusOptions = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "recruiter_contacted", label: "Recruiter Contacted" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "phone_interview", label: "Phone Interview" },
  { value: "video_interview", label: "Video Interview" },
  { value: "face_to_face_interview", label: "Face-to-face Interview" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "interview_completed", label: "Interview Completed" },
  { value: "second_interview", label: "Second Interview" },
  { value: "reference_check", label: "Reference Check" },
  { value: "offer_received", label: "Offer Received" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "closed", label: "Closed" },
] as const;

function isImageChatMessage(message: any) {
  return (
    message?.message_type === "image" ||
    String(message?.attachment_mime_type || "").startsWith("image/") ||
    /\.png$|\.jpg$|\.jpeg$|\.webp$|\.gif$/i.test(String(message?.attachment_url || ""))
  );
}

function renderChatMessageContent(message: any) {
  if (isImageChatMessage(message) && message?.attachment_url) {
    return (
      <div style={{ display: "grid", gap: "8px" }}>
        <img
          src={message.attachment_url}
          alt={message.attachment_name || "Chat image"}
          style={{ width: "220px", maxWidth: "100%", borderRadius: "14px", display: "block" }}
        />
        {message.content ? <div>{message.content}</div> : null}
      </div>
    );
  }

  if (message?.attachment_url && message?.message_type === "document") {
    return (
      <div style={{ display: "grid", gap: "6px" }}>
        <a href={message.attachment_url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
          {message.attachment_name || "Open attachment"}
        </a>
        {message.content ? <div>{message.content}</div> : null}
      </div>
    );
  }

  return <div>{message.content}</div>;
}

export default function App() {
  const realtimeTables = [
    "profiles",
    "jobs",
    "applications",
    "messages",
    "services",
    "pricing_plans",
    "resume_scores",
    "notifications",
    "user_subscriptions",
    "system_settings",
    "admins",
  ];

  // Clerk hooks
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { signOut: clerkSignOut } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();

  // Auth state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() => {
    const savedPreviewAuth = localStorage.getItem("admin_preview_authenticated") === "true";
    return savedPreviewAuth ? true : null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isPreviewAuthenticated, setIsPreviewAuthenticated] = useState(() => {
    return localStorage.getItem("admin_preview_authenticated") === "true";
  });
  const [emailInput] = useState<string>(previewAdminCredentials.email);
  const [passwordInput, setPasswordInput] = useState<string>(previewAdminCredentials.password);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState("");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [settingsSubsection, setSettingsSubsection] = useState<"personal_information" | "notifications">("personal_information");
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(true);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [savedJobEntries, setSavedJobEntries] = useState<any[]>([]);
  const [successStories, setSuccessStories] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [resumeScores, setResumeScores] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trackerInterviews, setTrackerInterviews] = useState<any[]>([]);
  const [trackerFollowUps, setTrackerFollowUps] = useState<any[]>([]);
  const [trackerContacts, setTrackerContacts] = useState<any[]>([]);
  const [trackerColdEmails, setTrackerColdEmails] = useState<any[]>([]);
  const [trackerScores, setTrackerScores] = useState<any[]>([]);
  const [trackerActivities, setTrackerActivities] = useState<any[]>([]);
  const [interviewPrepSessions, setInterviewPrepSessions] = useState<any[]>([]);
  const [interviewPrepResponses, setInterviewPrepResponses] = useState<any[]>([]);
  const [selectedTrackerClientId, setSelectedTrackerClientId] = useState("");
  const [trackerSection, setTrackerSection] = useState<"overview" | "applications" | "interviews" | "follow_ups" | "contacts" | "cold_emails" | "scores" | "activity">("overview");
  const [stats, setStats] = useState({
    usersCount: 0,
    jobsCount: 0,
    applicationsCount: 0,
    messagesCount: 0,
    activeSubscriptionsCount: 0
  });

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"user" | "job" | "plan" | "notification" | "resume" | "tracker" | "interview" | "follow_up" | "contact" | "cold_email" | "score" | "quick_update" | "success_story">("job");
  const [editItem, setEditItem] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Chat state
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hiringManagersUploadRef = useRef<HTMLInputElement>(null);
  const successStoryPhotoInputRef = useRef<HTMLInputElement>(null);
  const personalInfoPhotoInputRef = useRef<HTMLInputElement>(null);

  // App Settings state
  const [appSettings, setAppSettings] = useState({
    maintenanceMode: false,
    pushNotificationsEnabled: true,
    darkMode: true
  });

  // Form State Handlers
  const [userForm, setUserForm] = useState({
    id: "",
    full_name: "",
    email: "",
    phone_number: "",
    location: "",
    headline: "",
    avatar_url: "",
    linkedin_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    subscription_plan: "free",
  });
  const [jobForm, setJobForm] = useState({ id: "", title: "", company: "", location: "", salary: "", job_type: "Full-time", description: "", tags: "", job_link: "", user_id: "", application_id: "" });
  const [planForm, setPlanForm] = useState({ id: "", name: "", price: "", features: "" });
  const [notificationForm, setNotificationForm] = useState({ title: "", body: "", user_id: "", status: "sent" });
  const [resumeForm, setResumeForm] = useState({ user_id: "", score: 70, suggestions: "", notes: "" });
  const [trackerForm, setTrackerForm] = useState({ user_id: "", job_id: "", status: "applied" });
  const [interviewForm, setInterviewForm] = useState({ client_id: "", application_id: "", interview_type: "video", interview_round: "", interview_date: "", status: "scheduled", interviewer_name: "", interviewer_email: "", admin_notes: "" });
  const [followUpForm, setFollowUpForm] = useState({ client_id: "", application_id: "", follow_up_type: "email", due_date: "", status: "pending", contact_person: "", contact_email: "", notes: "" });
  const [contactForm, setContactForm] = useState({ client_id: "", application_id: "", recruiter_name: "", position: "", email: "", linkedin_url: "", contact_date: "", response_status: "no_response", notes: "" });
  const [coldEmailForm, setColdEmailForm] = useState({ client_id: "", application_id: "", recipient_name: "", recipient_email: "", company_name: "", subject: "", message: "", sent_at: "", delivery_status: "sent", response_status: "no_response" });
  const [scoreForm, setScoreForm] = useState({ client_id: "", application_id: "", ats_score: 0, ai_match_score: 0, score_reason: "", recommendations: "" });
  const [quickUpdateForm, setQuickUpdateForm] = useState({ application_id: "", status: "applied", current_stage: "applied", next_action: "", next_action_date: "", notes: "" });
  const [successStoryForm, setSuccessStoryForm] = useState({ id: "", name: "", position: "", year: "", message: "", story_rate: 5, photo_url: "", display_order: 0, is_active: true });
  const [successStoryPhotoUploading, setSuccessStoryPhotoUploading] = useState(false);

  const ensureAdminToken = async () => {
    const existingToken = localStorage.getItem("admin_auth_token");
    if (existingToken) {
      return existingToken;
    }

    const savedPreviewAuth = localStorage.getItem("admin_preview_authenticated") === "true";
    const canRestorePreviewToken = isPreviewAuthenticated || savedPreviewAuth || isAdmin === true;

    if (!canRestorePreviewToken) {
      return null;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: previewAdminCredentials.email,
          password: previewAdminCredentials.password,
          role: "admin",
        }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (data?.token) {
        localStorage.setItem("admin_auth_token", data.token);
        if (!isPreviewAuthenticated && savedPreviewAuth) {
          setIsPreviewAuthenticated(true);
        }
        return data.token as string;
      }
    } catch (error) {
      console.warn("[Admin Auth] Failed to restore admin token:", error);
    }

    return null;
  };

  useEffect(() => {
    if (userLoaded) {
      if (isSignedIn && user) {
        checkAdminStatus(user);
      } else {
        const savedPreviewAuth = localStorage.getItem("admin_preview_authenticated") === "true";
        if (!savedPreviewAuth) {
          setIsAdmin(false);
          setAuthLoading(false);
        } else {
          setAuthLoading(false);
        }
      }
    }
  }, [userLoaded, isSignedIn, user]);

  useEffect(() => {
    if (isPreviewAuthenticated) {
      void ensureAdminToken();
    }
  }, [isPreviewAuthenticated]);

  // Exchange Clerk session for backend JWT token
  useEffect(() => {
    async function exchangeClerkToken() {
      if (isSignedIn && user) {
        try {
          const res = await fetch("http://localhost:3000/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress || "admin@9jobs.app",
              userId: user.id,
              role: "admin",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("admin_auth_token", data.token);
            console.log("[Admin Auth] Swapped Clerk session for backend JWT.");
          }
        } catch (err) {
          console.warn("[Admin Auth] Clerk session token swap failed:", err);
        }
      }
    }
    void exchangeClerkToken();
  }, [isSignedIn, user]);

  // Connect to Socket.IO and listen to live events
  useEffect(() => {
    if (isAdmin) {
      void (async () => {
        const token = await ensureAdminToken();
        if (token) {
          connectAdminSocket(token, (event, payload) => {
            console.log(`[Admin Socket Event] ${event}:`, payload);
            if (event === "conversation_created" || event === "conversation_updated") {
              void fetchChatUsers();
            } else if (event === "new_message") {
              setMessages((prev) => {
                if (prev.some((m: any) => m.id === payload.id || (payload.client_message_id && m.client_message_id === payload.client_message_id))) {
                  return prev;
                }
                if (activeChatUser?.id === payload.conversation_id) {
                  return [...prev, payload];
                }
                return prev;
              });
              void fetchChatUsers();
            } else if (event === "message_seen" && payload.conversationId === activeChatUser?.id) {
              void fetchChatMessages(activeChatUser.id);
            } else if (event === "message_delivered" && payload.conversationId === activeChatUser?.id) {
              void fetchChatMessages(activeChatUser.id);
            }
          });
        }
      })();
    } else {
      disconnectAdminSocket();
    }

    return () => {
      disconnectAdminSocket();
    };
  }, [isAdmin, activeChatUser?.id]);


  // Fetch data on active tab change or admin verification
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (isAdmin && (activeTab === "job_tracker" || activeTab === "hiring_managers") && selectedTrackerClientId) {
      void fetchTrackerClientData(selectedTrackerClientId);
    }
    if (isAdmin && activeTab === "interview_preparation") {
      void fetchInterviewPreparationData(selectedTrackerClientId || undefined);
    }
  }, [activeTab, isAdmin, selectedTrackerClientId]);

  // Real-time Chat subscriptions
  useEffect(() => {
    if (!isAdmin || activeTab !== "messages") return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = {
            ...payload.new,
            content: payload.new.text || payload.new.content || "",
          };
          setMessages((prev) => {
            if (prev.some((m: any) => (m as any).id === (newMsg as any).id || ((m as any).client_message_id && (m as any).client_message_id === (newMsg as any).client_message_id))) {
              return prev;
            }
            return [...prev, newMsg];
          });
          // Refresh list to trigger preview update
          fetchChatUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase.channel(`admin-live-sync-${activeTab}`);
    for (const table of realtimeTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchData();
          if (activeTab === "dashboard") {
            void fetchDashboardStats();
          }
          if (activeTab === "messages" && activeChatUser?.id) {
            void fetchChatMessages(activeChatUser.id);
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, activeTab, activeChatUser?.id]);

  // Real-time Chat polling fallback for reliable message sync
  useEffect(() => {
    if (!isAdmin || activeTab !== "messages") return;

    const interval = setInterval(() => {
      void fetchChatUsers();
      if (activeChatUser?.id) {
        void fetchChatMessages(activeChatUser.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAdmin, activeTab, activeChatUser?.id]);

  // Real-time System Settings subscriptions
  useEffect(() => {
    if (!isAdmin) return;

    fetchSystemSettings();

    const channel = supabase
      .channel("system-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings", filter: "id=eq.1" },
        (payload) => {
          const newData = payload.new as any;
          if (newData) {
            setAppSettings({
              maintenanceMode: newData.maintenance_mode,
              pushNotificationsEnabled: newData.push_notifications_enabled,
              darkMode: newData.dark_mode_override
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatUser]);

  const checkAdminStatus = async (clerkUser: any) => {
    try {
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error("Clerk user has no primary email address.");

      // Fetch admins count
      const { data: adminList, error: countError } = await supabase.from("admins").select("*");
      const access = resolveAdminAccess(email, adminList, countError);

      // Bootstrapping: If there are no admins in the DB, make the first logged-in user the admin!
      if (access.shouldBootstrap) {
        const { error: insertError } = await supabase
          .from("admins")
          .insert([{ email }]);
        if (insertError) throw insertError;
        setIsAdmin(true);
        setAuthLoading(false);
        return;
      }

      if (access.fallbackReason === "missing-admins-table") {
        console.warn("Admins table missing in Supabase. Allowing authenticated admin preview access.");
      }

      // Check if user is in admin list
      const isUserAdmin = access.isAdmin;
      setIsAdmin(isUserAdmin);
      if (!isUserAdmin) {
        setAuthError(`Access denied. ${email} is not authorized in the 9Jobs Admin list.`);
        await clerkSignOut();
      }
    } catch (err: any) {
      console.error("Admin check failed:", err.message);
      setAuthError("Failed to verify admin status: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (validatePreviewAdminLogin(emailInput, passwordInput)) {
        // Exchange credentials for JWT token on backend
        try {
          const res = await fetch("http://localhost:3000/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: emailInput,
              password: passwordInput,
              role: "admin",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("admin_auth_token", data.token);
            console.log("[Admin Auth] Backend JWT token obtained.");
          } else {
            console.warn("[Admin Auth] Backend token endpoint returned error, starting in direct DB fallback.");
          }
        } catch (fetchErr) {
          console.warn("[Admin Auth] Backend server not reachable, starting in direct DB fallback:", fetchErr);
        }

        localStorage.setItem("admin_preview_authenticated", "true");
        setIsPreviewAuthenticated(true);
        setIsAdmin(true);
        setAuthLoading(false);
        return;
      }

      if (signInLoaded && signIn && setActive) {
        const result = await signIn.create({
          identifier: emailInput.trim(),
          password: passwordInput,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          setAuthLoading(false);
          return;
        }

        setAuthError("Clerk sign-in needs one more step before admin access can finish.");
        setAuthLoading(false);
        return;
      }

      setAuthError("Password is incorrect. Try again with the approved local admin password.");
      setAuthLoading(false);
    } catch (err: any) {
      setAuthError(err.errors?.[0]?.longMessage || err.message);
      setAuthLoading(false);
    }
  };


  const handleLogout = async () => {
    localStorage.removeItem("admin_auth_token");
    localStorage.removeItem("admin_preview_authenticated");
    if (isPreviewAuthenticated) {
      setIsPreviewAuthenticated(false);
      setIsAdmin(false);
      setPasswordInput(previewAdminCredentials.password);
      return;
    }

    await clerkSignOut();
    setIsAdmin(false);
  };


  const isMissingRelationError = (error: unknown) => {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "";

    return (
      message.includes("schema cache") ||
      message.includes("Could not find the table") ||
      message.includes("relation") ||
      message.includes("404")
    );
  };

  const isRowLevelSecurityError = (error: unknown) => {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message).toLowerCase()
        : "";

    return message.includes("row-level security");
  };

  const canRetryJobWithoutLink = (error: unknown) => {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message).toLowerCase()
        : "";

    return message.includes("job_link");
  };

  const upsertJobRecord = async (jobRecord: any) => {
    const primaryResult = await supabase.from("jobs").upsert([jobRecord], { onConflict: "id" });
    if (!primaryResult.error) {
      return;
    }

    if (!canRetryJobWithoutLink(primaryResult.error)) {
      throw primaryResult.error;
    }

    const { job_link: _jobLink, ...legacyJobRecord } = jobRecord;
    const fallbackResult = await supabase.from("jobs").upsert([legacyJobRecord], { onConflict: "id" });
    if (fallbackResult.error) {
      throw fallbackResult.error;
    }
  };

  const toAdminErrorMessage = (error: unknown) => {
    const rawMessage =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Unknown error";

    if (isMissingRelationError(error)) {
      const setupMessage =
        "Supabase live-sync setup is incomplete for this project. Re-run D:/9jobs-App/mobile/supabase/schema.sql in the configured Supabase database so tables and preview access policies are applied, then admin and app updates will sync both ways in real time.";
      setSchemaWarning(setupMessage);
      return setupMessage;
    }

    return rawMessage;
  };

  // Centralized data fetch controller
  const fetchData = async () => {
    try {
      switch (activeTab) {
        case "dashboard":
          await Promise.all([fetchDashboardStats(), fetchJobs(), fetchServices()]);
          break;
        case "users":
          await fetchUsers();
          break;
        case "jobs":
          await Promise.all([fetchJobs(), fetchUsers()]);
          break;
        case "saved_jobs":
          await Promise.all([fetchUsers(), fetchSavedJobs()]);
          break;
        case "success_stories":
          await fetchSuccessStories();
          break;
        case "applications":
          await fetchApplications();
          break;
        case "job_tracker":
          await Promise.all([fetchApplications(), fetchUsers(), fetchJobs(), fetchResumeScores()]);
          if (selectedTrackerClientId) {
            await fetchTrackerClientData(selectedTrackerClientId);
          }
          break;
        case "hiring_managers":
          await fetchUsers();
          if (selectedTrackerClientId) {
            await fetchTrackerClientData(selectedTrackerClientId);
          }
          break;
        case "interview_preparation":
          await fetchUsers();
          await fetchInterviewPreparationData(selectedTrackerClientId || undefined);
          break;
        case "messages":
          await fetchChatUsers();
          break;
        case "services":
          await fetchServices();
          break;
        case "resume_ai":
          await fetchResumeScores();
          break;
        case "subscriptions":
          await fetchPlans();
          break;
        case "settings":
          await Promise.all([fetchSystemSettings(), fetchNotifications(), fetchUsers()]);
          break;
        default:
          break;
      }
      setSchemaWarning("");
    } catch (err: any) {
      console.error(`Fetch failed for tab ${activeTab}:`, err.message);
      setSchemaWarning(toAdminErrorMessage(err));
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAppSettings({
          maintenanceMode: data.maintenance_mode,
          pushNotificationsEnabled: data.push_notifications_enabled,
          darkMode: data.dark_mode_override
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch system settings:", err.message);
      throw err;
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [usersResult, jobsResult, applicationsResult, messagesResult, subscriptionsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active")
      ]);

      const statsErrors = [
        usersResult.error,
        jobsResult.error,
        applicationsResult.error,
        messagesResult.error,
        subscriptionsResult.error,
      ].filter(Boolean);

      if (statsErrors.length > 0) {
        throw statsErrors[0];
      }

      setStats({
        usersCount: usersResult.count || 0,
        jobsCount: jobsResult.count || 0,
        applicationsCount: applicationsResult.count || 0,
        messagesCount: messagesResult.count || 0,
        activeSubscriptionsCount: subscriptionsResult.count || 0
      });
    } catch (err: any) {
      console.error("Dashboard stats failed:", err.message);
      throw err;
    }
  };

  const fetchUsers = async () => {
    const token = await ensureAdminToken();
    const personalInfoPromise = token
      ? fetch(`${BACKEND_URL}/api/admin/personal-info`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || `HTTP error ${response.status}`);
          }
          return response.json();
        })
      : Promise.resolve({ profiles: [] as any[] });

    const [profilesResult, applicationsResult, interviewsResult, activityResult, conversationsResult, personalInfoResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*"),
      supabase.from("interviews").select("*"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("conversations").select("*").order("updated_at", { ascending: false }),
      personalInfoPromise,
    ]);

    if (profilesResult.error && !isRowLevelSecurityError(profilesResult.error) && !isMissingRelationError(profilesResult.error)) {
      throw profilesResult.error;
    }
    if (applicationsResult.error && !isRowLevelSecurityError(applicationsResult.error) && !isMissingRelationError(applicationsResult.error)) {
      throw applicationsResult.error;
    }
    if (interviewsResult.error && !isRowLevelSecurityError(interviewsResult.error) && !isMissingRelationError(interviewsResult.error)) {
      throw interviewsResult.error;
    }
    if (activityResult.error && !isRowLevelSecurityError(activityResult.error) && !isMissingRelationError(activityResult.error)) {
      throw activityResult.error;
    }
    if (conversationsResult.error && !isRowLevelSecurityError(conversationsResult.error) && !isMissingRelationError(conversationsResult.error)) {
      throw conversationsResult.error;
    }

    const profiles = ((profilesResult.data || []) as any[]).filter((profile) => profile.role !== "admin" && profile.role !== "staff");
    const backendProfiles = Array.isArray((personalInfoResult as any)?.profiles)
      ? ((personalInfoResult as any).profiles as any[])
      : [];
    const applicationsData = (applicationsResult.data || []) as any[];
    const interviewsData = (interviewsResult.data || []) as any[];
    const activityData = (activityResult.data || []) as any[];
    const conversationsData = (conversationsResult.data || []) as any[];

    const profileMap = new Map<string, any>();
    for (const profile of profiles) {
      profileMap.set(profile.id, profile);
    }
    for (const profile of backendProfiles) {
      profileMap.set(profile.id, { ...profileMap.get(profile.id), ...profile });
    }

    if (!profileMap.has(previewTrackerClient.id)) {
      profileMap.set(previewTrackerClient.id, previewTrackerClient);
    }

    const candidateIds = new Set<string>();
    for (const profile of profileMap.values()) {
      candidateIds.add(profile.id);
    }
    for (const application of applicationsData) {
      const clientId = application.client_id || application.user_id;
      if (clientId) {
        candidateIds.add(clientId);
      }
    }
    for (const interview of interviewsData) {
      if (interview.client_id) {
        candidateIds.add(interview.client_id);
      }
    }
    for (const activity of activityData) {
      if (activity.client_id) {
        candidateIds.add(activity.client_id);
      }
    }
    for (const conversation of conversationsData) {
      if (conversation.client_id) {
        candidateIds.add(conversation.client_id);
      }
    }

    const enrichedUsers = Array.from(candidateIds).map((candidateId) => {
      const profile = profileMap.get(candidateId) || {
        id: candidateId,
        full_name: candidateId === previewTrackerClient.id ? previewTrackerClient.full_name : `Client (${candidateId.substring(0, 8)})`,
        email: candidateId === previewTrackerClient.id ? previewTrackerClient.email : "No email",
        phone_number: "",
        timezone: "Australia/Melbourne",
        role: "client",
      };
      const clientApplications = applicationsData.filter((application) => (application.client_id || application.user_id) === profile.id);
      const clientInterviews = interviewsData.filter((interview) => interview.client_id === profile.id);
      const latestActivity = activityData.find((activity) => activity.client_id === profile.id);
      const metrics = calculateTrackerMetrics({
        applications: clientApplications,
        interviews: clientInterviews,
        timezone: profile.timezone || "Australia/Melbourne",
      });

      return {
        ...profile,
        totalApplications: metrics.totalApplications,
        activeRoles: metrics.currentFocus.totalActiveRoles,
        interviewsCount: metrics.interviewing + metrics.interviewCompleted,
        offersCount: metrics.offers,
        hiredCount: metrics.hired,
        lastActivityAt: latestActivity?.created_at || profile.updated_at || profile.created_at,
      };
    }).sort((a, b) => {
      const aTime = new Date(a.lastActivityAt || 0).getTime();
      const bTime = new Date(b.lastActivityAt || 0).getTime();
      return bTime - aTime;
    });

    setUsers(enrichedUsers);
    if (!selectedTrackerClientId && enrichedUsers.length > 0) {
      setSelectedTrackerClientId(enrichedUsers[0].id);
    }
  };

  const fetchJobs = async () => {
    const { data: jobsData, error: jobsError } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (jobsError && !isRowLevelSecurityError(jobsError) && !isMissingRelationError(jobsError)) throw jobsError;
    const resolvedJobs = mergePreviewJobs((jobsData || []) as any[]);
    setJobs(resolvedJobs);
  };

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("applications")
      .select("*, profiles!inner(*), jobs!inner(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setApplications(data || []);
  };

  const fetchSavedJobs = async () => {
    const token = await ensureAdminToken();
    if (!token) {
      throw new Error("Admin auth token missing. Please sign in again.");
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/tracker/saved-jobs`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
    }

    const payload = await response.json();
    setSavedJobEntries(payload.entries || []);
  };

  const fetchSuccessStories = async () => {
    try {
      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/success-stories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
      }

      const payload = await response.json();
      const backendStories = payload.stories || [];
      const localStories = readLocalSuccessStories();

      if (localStories.length > 0) {
        try {
          const migratedStories = await syncLocalSuccessStoriesToBackend(localStories, ensureAdminToken);
          const mergedStories = [...backendStories];
          for (const migratedStory of migratedStories) {
            if (!mergedStories.some((item: any) => item.id === migratedStory.id)) {
              mergedStories.push(migratedStory);
            }
          }

          mergedStories.sort((left: any, right: any) => {
            const leftOrder = Number(left.display_order ?? 0);
            const rightOrder = Number(right.display_order ?? 0);
            if (leftOrder !== rightOrder) {
              return leftOrder - rightOrder;
            }

            return String(right.created_at || "").localeCompare(String(left.created_at || ""));
          });

          setSuccessStories(mergedStories);
          return;
        } catch (migrationError) {
          console.warn("Local success stories migration to backend failed, keeping admin-only preview copy:", migrationError);
        }
      }

      setSuccessStories(backendStories);
      return;
    } catch (backendError) {
      console.warn("fetchSuccessStories backend call failed, falling back to Supabase direct query:", backendError);
    }

    const { data, error } = await supabase
      .from("success_stories")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        const localStories = readLocalSuccessStories();
        setSuccessStories(localStories);
        return;
      }

      throw error;
    }

    setSuccessStories(data || []);
  };

  const uploadSuccessStoryPhoto = async (file: File) => {
    try {
      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const buffer = await file.arrayBuffer();
      const response = await fetch(`${BACKEND_URL}/api/admin/success-stories/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "image/jpeg",
          "x-file-name": file.name,
          "x-file-type": file.type || "image/jpeg",
        },
        body: buffer,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error("Story photo uploaded but URL was missing.");
      }

      return payload.url as string;
    } catch (backendError) {
      console.warn("uploadSuccessStoryPhoto backend upload failed, falling back to inline data URL:", backendError);
    }

    return await createCompressedImageDataUrl(file);
  };

  const fetchTrackerClientData = async (clientId: string) => {
    const contactsPromise = (async () => {
      const directResult = await supabase
        .from("recruiter_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("contact_date", { ascending: false });

      if (!directResult.error || !isMissingRelationError(directResult.error)) {
        return directResult;
      }

      const token = await ensureAdminToken();
      if (!token) {
        return directResult;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/tracker/contacts?clientId=${encodeURIComponent(clientId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return directResult;
      }

      const payload = await response.json();
      return { data: payload.contacts ?? [], error: null };
    })();

    const [
      applicationsResult,
      interviewsResult,
      followUpsResult,
      contactsResult,
      coldEmailsResult,
      scoresResult,
      activityResult,
    ] = await Promise.all([
      supabase.from("applications").select("*, jobs(*)").eq("user_id", clientId).order("created_at", { ascending: false }),
      supabase.from("interviews").select("*").eq("client_id", clientId).order("interview_date", { ascending: false }),
      supabase.from("follow_ups").select("*").eq("client_id", clientId).order("due_date", { ascending: true }),
      contactsPromise,
      supabase.from("cold_emails").select("*").eq("client_id", clientId).order("sent_at", { ascending: false }),
      supabase.from("client_scores").select("*").eq("client_id", clientId).order("calculated_at", { ascending: false }),
      supabase.from("activity_logs").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);

    const results = [applicationsResult, interviewsResult, followUpsResult, contactsResult, coldEmailsResult, scoresResult, activityResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw firstError;

    setApplications(applicationsResult.data || []);
    setTrackerInterviews(interviewsResult.data || []);
    setTrackerFollowUps(followUpsResult.data || []);
    setTrackerContacts(contactsResult.data || []);
    setTrackerColdEmails(coldEmailsResult.data || []);
    setTrackerScores(scoresResult.data || []);
    setTrackerActivities(activityResult.data || []);
  };

  const fetchChatUsers = async () => {
    try {
      const token = localStorage.getItem("admin_auth_token");
      const res = await fetch("http://localhost:3000/api/admin/conversations", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      const chatUsers = data.map((c: any) => ({
        id: c.clientId,
        full_name: c.clientName,
        email: c.clientEmail,
        avatar_url: null,
        phone: "No phone",
        lastMessage: c.lastMessageText || "No messages yet",
        lastMessageTime: c.lastMessageAt,
        unreadCount: c.adminUnreadCount,
        status: c.status,
        assignedAdminId: c.assignedAdminId,
      }));

      setUsers(chatUsers);
      if (chatUsers.length > 0 && !activeChatUser) {
        setActiveChatUser(chatUsers[0]);
        fetchChatMessages(chatUsers[0].id);
      }
    } catch (err: any) {
      console.warn("fetchChatUsers backend call failed, falling back to Supabase direct query:", err);
      try {
        const { data: conversations, error } = await supabase
          .from("conversations")
          .select("*, profiles(*)")
          .order("last_message_at", { ascending: false });
        if (error) throw error;

        const chatUsers = (conversations || []).map((c: any) => {
          const profile = c.profiles || {};
          return {
            id: c.client_id,
            full_name: profile.full_name || "Client (" + c.client_id.substring(0, 8) + ")",
            email: profile.email || "No email",
            avatar_url: profile.avatar_url,
            phone: profile.phone_number || "No phone",
            lastMessage: c.last_message_text || "No messages yet",
            lastMessageTime: c.last_message_at,
            unreadCount: c.admin_unread_count,
            status: c.status,
            assignedAdminId: c.assigned_admin_id,
          };
        });

        setUsers(chatUsers);
        if (chatUsers.length > 0 && !activeChatUser) {
          setActiveChatUser(chatUsers[0]);
          fetchChatMessages(chatUsers[0].id);
        }
      } catch (dbErr: any) {
        console.warn("Supabase conversations query failed, trying message log aggregation:", dbErr);
        try {
          const { data: msgProfiles, error: profileErr } = await supabase.from("profiles").select("*");
          if (profileErr) throw profileErr;

          const { data: lastMsgs, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false });
          if (msgError) throw msgError;

          const clientIds = new Set<string>();
          (lastMsgs || []).forEach((m: any) => {
            if (m.sender_id && m.sender_id !== "admin") clientIds.add(m.sender_id);
            if (m.recipient_id && m.recipient_id !== "admin") clientIds.add(m.recipient_id);
            if (m.conversation_id && m.conversation_id !== "admin") clientIds.add(m.conversation_id);
          });

          const chatUsers = Array.from(clientIds).map((cid) => {
            const profile = (msgProfiles || []).find((p: any) => p.id === cid) || {};
            const userMsgs = (lastMsgs || []).filter((m: any) => m.sender_id === cid || m.recipient_id === cid || m.conversation_id === cid);
            const lastMsg = userMsgs[0];
            
            return {
              id: cid,
              full_name: profile.full_name || "Client (" + cid.substring(0, 8) + ")",
              email: profile.email || "No email",
              avatar_url: profile.avatar_url,
              phone: profile.phone_number || "No phone",
              lastMessage: lastMsg?.text || lastMsg?.content || "No messages yet",
              lastMessageTime: lastMsg?.created_at,
              unreadCount: 0,
              status: "open",
            };
          });

          const activeUsers = chatUsers
            .filter((u: any) => u.lastMessageTime)
            .sort((a: any, b: any) => b.lastMessageTime.localeCompare(a.lastMessageTime));

          setUsers(activeUsers);
          if (activeUsers.length > 0 && !activeChatUser) {
            setActiveChatUser(activeUsers[0]);
            fetchChatMessages(activeUsers[0].id);
          }
        } catch (fallbackErr: any) {
          showError(fallbackErr.message);
        }
      }
    }
  };

  const fetchInterviewPreparationData = async (clientId?: string) => {
    const token = await ensureAdminToken();
    if (!token) {
      throw new Error("Admin auth token missing. Please sign in again.");
    }

    const url = clientId
      ? `${BACKEND_URL}/api/admin/interview-prep?clientId=${encodeURIComponent(clientId)}`
      : `${BACKEND_URL}/api/admin/interview-prep`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
    }

    const payload = await res.json();
    setInterviewPrepSessions(payload.sessions ?? []);
    setInterviewPrepResponses(payload.responses ?? []);
  };

  const fetchChatMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem("admin_auth_token");
      
      // 1. Mark messages seen on backend
      await fetch(`http://localhost:3000/api/admin/conversations/${userId}/seen`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      // 2. Fetch messages from backend
      const res = await fetch(`http://localhost:3000/api/admin/conversations/${userId}/messages`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      
      const mapped = (data || []).map((m: any) => ({
        ...m,
        content: m.text || m.content || "",
      }));
      setMessages(mapped);
    } catch (err: any) {
      console.warn("fetchChatMessages backend call failed, falling back to direct Supabase query:", err);
      try {
        await supabase
          .from("messages")
          .update({ status: "seen", seen_at: new Date().toISOString() })
          .eq("conversation_id", userId)
          .eq("sender_role", "client")
          .is("seen_at", null);

        await supabase
          .from("conversations")
          .update({ admin_unread_count: 0 })
          .eq("id", userId);

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", userId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        
        const mapped = (data || []).map((m: any) => ({
          ...m,
          content: m.text || m.content || "",
        }));
        setMessages(mapped);
      } catch (dbErr: any) {
        try {
          const { data, error: fallbackError } = await supabase
            .from("messages")
            .select("*")
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order("created_at", { ascending: true });
          if (fallbackError) throw fallbackError;

          const mapped = (data || []).map((m: any) => ({
            ...m,
            sender_role: m.sender_role || (m.sender_id === "admin" ? "admin" : "client"),
            content: m.content || m.text || "",
            status: m.status || "seen",
          }));
          setMessages(mapped);
        } catch (fallbackErr: any) {
          showError(fallbackErr.message);
        }
      }
    }
  };


  const fetchServices = async () => {
    const { data, error } = await supabase.from("services").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    setServices(data || []);
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase.from("pricing_plans").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    setPlans(data || []);
  };

  const fetchResumeScores = async () => {
    const { data, error } = await supabase
      .from("resume_scores")
      .select("*, profiles!inner(*)");
    if (error) throw error;
    setResumeScores(data || []);
  };

  const fetchNotifications = async () => {
    const token = await ensureAdminToken();
    if (!token) {
      throw new Error("Admin auth token missing. Please sign in again.");
    }

    const res = await fetch(`${BACKEND_URL}/api/admin/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
    }

    const payload = await res.json();
    setNotifications(payload.notifications || []);
  };

  // CRUD Actions
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = editItem?.id || userForm.id || "user_" + Math.random().toString(36).substring(2, 10);
      const payload = {
        id: userId,
        full_name: userForm.full_name,
        email: userForm.email,
        phone_number: userForm.phone_number,
        location: userForm.location,
        headline: userForm.headline,
        avatar_url: userForm.avatar_url,
        linkedin_url: userForm.linkedin_url,
        facebook_url: userForm.facebook_url,
        instagram_url: userForm.instagram_url,
        twitter_url: userForm.twitter_url,
        subscription_plan: userForm.subscription_plan
      };

      const token = await ensureAdminToken();
      if (token) {
        const backendResponse = await fetch(`${BACKEND_URL}/api/admin/personal-info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profile: payload }),
        });

        if (!backendResponse.ok) {
          const errorPayload = await backendResponse.json().catch(() => null);
          throw new Error(errorPayload?.error || `HTTP error ${backendResponse.status}`);
        }
      }

      if (editItem) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", editItem.id);
        if (error && !isRowLevelSecurityError(error) && !isMissingRelationError(error)) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert([payload]);
        if (error && !isRowLevelSecurityError(error) && !isMissingRelationError(error)) throw error;
      }

      const { error: subscriptionError } = await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        plan_id: userForm.subscription_plan,
        status: "active",
      });
      if (subscriptionError && !isRowLevelSecurityError(subscriptionError) && !isMissingRelationError(subscriptionError)) throw subscriptionError;

      showSuccess("User saved successfully!");
      await fetchUsers();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobId = editItem?.id || jobForm.id || "job_" + Math.random().toString(36).substring(2, 10);
      const applicationId = jobForm.application_id ? Number(jobForm.application_id) : null;
      const payload = {
        title: jobForm.title,
        company: jobForm.company,
        location: jobForm.location,
        salary: jobForm.salary || "Not disclosed",
        job_type: jobForm.job_type,
        job_link: jobForm.job_link.trim(),
        description: jobForm.description.trim() || `${jobForm.title} role at ${jobForm.company}.`,
        tags: jobForm.tags.split(",").map((t) => t.trim()).filter(Boolean)
      };
      const jobRecord = { id: jobId, ...payload, posted_at: "Just now" };

      if (jobForm.user_id) {
        const existingSavedJob = savedJobEntries.find((entry) => {
          const entryApplicationId = entry.application_id ? Number(entry.application_id) : null;
          return (
            (applicationId && entryApplicationId === applicationId) ||
            (entry.user_id === jobForm.user_id && entry.job_id === jobId)
          );
        });
        const trackerStatus = existingSavedJob?.status || "saved";
        const trackerPayload = {
          ...(applicationId ? { id: applicationId } : {}),
          user_id: jobForm.user_id,
          client_id: jobForm.user_id,
          job_id: jobId,
          status: trackerStatus,
          current_stage: existingSavedJob?.current_stage || trackerStatus,
          is_saved: true,
          is_active: !["hired", "rejected", "withdrawn", "closed"].includes(trackerStatus),
          application_date: existingSavedJob?.application_date || existingSavedJob?.created_at || new Date().toISOString(),
          applied_at: existingSavedJob?.applied_at || null,
          company_name: payload.company,
          job_title: payload.title,
          job_location: payload.location,
          state: payload.location.split(",").slice(-1)[0]?.trim() || "",
          country: "Australia",
          salary_range: payload.salary,
          work_type: payload.location.toLowerCase().includes("remote") ? "Remote" : "On-site",
          employment_type: payload.job_type,
          job_description: payload.description,
          created_by_admin_id: user?.id || "admin",
        };
        const token = await ensureAdminToken();
        if (!token) {
          throw new Error("Admin auth token missing. Please sign in again.");
        }

        const response = await fetch(`${BACKEND_URL}/api/admin/tracker/applications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            application: trackerPayload,
            job: jobRecord,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
        }
      } else if (editItem) {
        await upsertJobRecord({ id: editItem.id, ...payload, posted_at: editItem.posted_at || "Just now" });
      } else {
        await upsertJobRecord(jobRecord);
      }

      showSuccess(jobForm.user_id ? "Saved role synced to the app successfully!" : "Job saved successfully!");
      void Promise.all([fetchJobs(), fetchUsers(), fetchSavedJobs()]);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSuccessStoryPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setSuccessStoryPhotoUploading(true);
      const photoUrl = await uploadSuccessStoryPhoto(file);
      setSuccessStoryForm((current) => ({ ...current, photo_url: photoUrl }));
    } catch (err: any) {
      showError(err.message || "Failed to upload story photo.");
    } finally {
      setSuccessStoryPhotoUploading(false);
    }
  };

  const handlePersonalInfoPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const photoUrl = await createCompressedImageDataUrl(file);
      setUserForm((current) => ({ ...current, avatar_url: photoUrl }));
    } catch (err: any) {
      showError(err.message || "Failed to process selected profile photo.");
    }
  };

  const handleSaveSuccessStory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        id: editItem?.id || successStoryForm.id || "",
        name: successStoryForm.name.trim(),
        position: successStoryForm.position.trim(),
        year: successStoryForm.year.trim() || "Recent",
        message: successStoryForm.message.trim(),
        story_rate: Number(successStoryForm.story_rate),
        photo_url: successStoryForm.photo_url.trim(),
        display_order: Number(successStoryForm.display_order) || 0,
        is_active: successStoryForm.is_active,
      };

      try {
        const token = await ensureAdminToken();
        if (!token) {
          throw new Error("Admin auth token missing. Please sign in again.");
        }

        const response = await fetch(`${BACKEND_URL}/api/admin/success-stories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ story: payload }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
        }
      } catch (backendError) {
        console.warn("handleSaveSuccessStory backend save failed, falling back to Supabase upsert:", backendError);
        const recordId = payload.id || `story_${Math.random().toString(36).slice(2, 10)}`;
        const { error } = await supabase
          .from("success_stories")
          .upsert([{ ...payload, id: recordId, updated_at: new Date().toISOString() }], { onConflict: "id" });
        if (error) {
          if (isMissingRelationError(error)) {
            upsertLocalSuccessStoryRecord({ ...payload, id: recordId });
          } else {
            throw error;
          }
        }
      }

      showSuccess("Success story saved successfully!");
      void fetchSuccessStories();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: planForm.name,
        price: planForm.price,
        features: planForm.features.split(",").map((f) => f.trim()).filter(Boolean)
      };

      if (editItem) {
        const { error } = await supabase.from("pricing_plans").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const planId = planForm.id.toLowerCase().replace(/[^a-z0-9]/g, "");
        const { error } = await supabase.from("pricing_plans").insert([{ id: planId, ...payload }]);
        if (error) throw error;
      }

      showSuccess("Pricing plan saved successfully!");
      fetchPlans();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notification: {
            id: editItem?.id,
            title: notificationForm.title,
            body: notificationForm.body,
            user_id: notificationForm.user_id.trim() || null,
            status: notificationForm.status || "sent",
          },
        }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
      }

      const payload = await res.json();
      if (editItem) {
        showSuccess("Notification updated successfully!");
      } else if (Array.isArray(payload.notifications)) {
        showSuccess(`Broadcast sent to ${payload.notifications.length} clients.`);
      } else {
        showSuccess("Notification sent successfully!");
      }

      fetchNotifications();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveResumeScore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        score: Number(resumeForm.score),
        suggestions: resumeForm.suggestions.split(",").map((s) => s.trim()).filter(Boolean),
        notes: resumeForm.notes
      };

      const { error } = await supabase
        .from("resume_scores")
        .upsert({ user_id: resumeForm.user_id, ...payload, updated_at: new Date() });
      if (error) throw error;

      showSuccess("Resume score and AI tips updated!");
      fetchResumeScores();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedJob = jobs.find((job) => job.id === trackerForm.job_id) || previewTrackerJobs.find((job) => job.id === trackerForm.job_id);
      if (!selectedJob) {
        throw new Error("Please select an opportunity.");
      }

      const payload = {
        ...(editItem?.id ? { id: editItem.id } : {}),
        user_id: trackerForm.user_id,
        client_id: trackerForm.user_id,
        job_id: trackerForm.job_id,
        status: trackerForm.status,
        current_stage: trackerForm.status,
        is_saved: trackerForm.status === "saved",
        is_active: !["hired", "rejected", "withdrawn", "closed"].includes(trackerForm.status),
        application_date: new Date().toISOString(),
        applied_at: new Date().toISOString(),
        company_name: selectedJob.company,
        job_title: selectedJob.title,
        job_location: selectedJob.location,
        salary_range: selectedJob.salary,
        work_type: selectedJob.job_type || "Full-time",
        employment_type: selectedJob.job_type || "Full-time",
        job_description: selectedJob.description || "",
        created_by_admin_id: user?.id || "admin",
      };
      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/tracker/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          application: payload,
          job: selectedJob,
        }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
      }

      await logActivity(payload.user_id, editItem?.id ?? null, "application_saved", "Application saved", "Application tracker entry created or updated from admin panel.", editItem ?? null, payload);
      showSuccess("Job tracker updated successfully!");
      if (payload.user_id) {
        await fetchTrackerClientData(payload.user_id);
      } else {
        fetchApplications();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const logActivity = async (
    clientId: string,
    applicationId: number | null,
    activityType: string,
    title: string,
    description: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
  ) => {
    await supabase.from("activity_logs").insert([{
      client_id: clientId,
      application_id: applicationId,
      performed_by: user?.primaryEmailAddress?.emailAddress || "admin",
      activity_type: activityType,
      title,
      description,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      metadata: {},
    }]);
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        client_id: interviewForm.client_id,
        application_id: Number(interviewForm.application_id),
        interview_type: interviewForm.interview_type,
        interview_round: interviewForm.interview_round,
        interview_date: interviewForm.interview_date,
        status: interviewForm.status,
        interviewer_name: interviewForm.interviewer_name,
        interviewer_email: interviewForm.interviewer_email,
        admin_notes: interviewForm.admin_notes,
      };

      if (editItem) {
        const { error } = await supabase.from("interviews").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("interviews").insert([payload]);
        if (error) throw error;
      }

      await logActivity(payload.client_id, payload.application_id, "interview_saved", "Interview saved", "Interview details updated from admin panel.", editItem ?? null, payload);
      showSuccess("Interview saved successfully!");
      await fetchTrackerClientData(payload.client_id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        client_id: followUpForm.client_id,
        application_id: Number(followUpForm.application_id),
        follow_up_type: followUpForm.follow_up_type,
        due_date: followUpForm.due_date,
        status: followUpForm.status,
        contact_person: followUpForm.contact_person,
        contact_email: followUpForm.contact_email,
        notes: followUpForm.notes,
        created_by: user?.primaryEmailAddress?.emailAddress || "admin",
      };

      if (editItem) {
        const { error } = await supabase.from("follow_ups").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follow_ups").insert([payload]);
        if (error) throw error;
      }

      await logActivity(payload.client_id, payload.application_id, "follow_up_saved", "Follow-up saved", "Follow-up details updated from admin panel.", editItem ?? null, payload);
      showSuccess("Follow-up saved successfully!");
      await fetchTrackerClientData(payload.client_id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editItem?.id ? { id: editItem.id } : {}),
        client_id: contactForm.client_id,
        application_id: contactForm.application_id ? Number(contactForm.application_id) : null,
        recruiter_name: contactForm.recruiter_name,
        company_name: contactForm.position,
        email: contactForm.email,
        linkedin_url: contactForm.linkedin_url,
        contact_method: contactForm.linkedin_url ? "linkedin" : contactForm.email ? "email" : "other",
        contact_date: contactForm.contact_date || new Date().toISOString(),
        response_status: contactForm.response_status,
        notes: contactForm.notes,
      };

      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/tracker/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contact: payload }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
      }

      await logActivity(payload.client_id, payload.application_id, "recruiter_contact_saved", "Hiring manager saved", "Hiring manager details updated from admin panel.", editItem ?? null, payload);
      showSuccess("Hiring manager saved successfully!");
      await fetchTrackerClientData(payload.client_id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleHiringManagersUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!selectedTrackerClientId) {
      showError("Please select a client before uploading hiring managers.");
      return;
    }

    try {
      const rows = parseHiringManagersCsv(await file.text());
      if (rows.length === 0) {
        throw new Error("Upload file is empty.");
      }

      const payload = rows.map((row) => ({
        client_id: selectedTrackerClientId,
        application_id: null,
        recruiter_name: row.name,
        company_name: row.position,
        email: row.email,
        linkedin_url: row.profileLink,
        contact_method: row.profileLink ? "linkedin" : row.email ? "email" : "other",
        contact_date: new Date().toISOString(),
        response_status: "no_response",
        notes: "Uploaded from admin panel",
      }));

      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/tracker/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contacts: payload }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
      }

      await logActivity(
        selectedTrackerClientId,
        null,
        "hiring_managers_uploaded",
        "Hiring managers uploaded",
        `${payload.length} hiring manager records uploaded from admin panel.`,
        null,
        { count: payload.length },
      );

      showSuccess(`Uploaded ${payload.length} hiring manager${payload.length === 1 ? "" : "s"} successfully!`);
      await fetchTrackerClientData(selectedTrackerClientId);
    } catch (err: any) {
      showError(err.message || "Failed to upload hiring managers.");
    }
  };

  const handleSaveColdEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        client_id: coldEmailForm.client_id,
        application_id: coldEmailForm.application_id ? Number(coldEmailForm.application_id) : null,
        recipient_name: coldEmailForm.recipient_name,
        recipient_email: coldEmailForm.recipient_email,
        company_name: coldEmailForm.company_name,
        subject: coldEmailForm.subject,
        message: coldEmailForm.message,
        sent_at: coldEmailForm.sent_at || new Date().toISOString(),
        delivery_status: coldEmailForm.delivery_status,
        response_status: coldEmailForm.response_status,
        created_by: user?.primaryEmailAddress?.emailAddress || "admin",
      };

      if (editItem) {
        const { error } = await supabase.from("cold_emails").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cold_emails").insert([payload]);
        if (error) throw error;
      }

      await logActivity(payload.client_id, payload.application_id, "cold_email_saved", "Cold email saved", "Cold email details updated from admin panel.", editItem ?? null, payload);
      showSuccess("Cold email saved successfully!");
      await fetchTrackerClientData(payload.client_id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        client_id: scoreForm.client_id,
        application_id: scoreForm.application_id ? Number(scoreForm.application_id) : null,
        ats_score: Number(scoreForm.ats_score),
        ai_match_score: Number(scoreForm.ai_match_score),
        score_reason: scoreForm.score_reason,
        recommendations: scoreForm.recommendations.split(",").map((item) => item.trim()).filter(Boolean),
        calculated_at: new Date().toISOString(),
        updated_by: user?.primaryEmailAddress?.emailAddress || "admin",
      };

      if (payload.ats_score < 0 || payload.ats_score > 100 || payload.ai_match_score < 0 || payload.ai_match_score > 100) {
        throw new Error("Scores must be between 0 and 100.");
      }

      if (editItem) {
        const { error } = await supabase.from("client_scores").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_scores").insert([payload]);
        if (error) throw error;
      }

      await logActivity(payload.client_id, payload.application_id, "score_saved", "Scores updated", "ATS and AI match scores updated from admin panel.", editItem ?? null, payload);
      showSuccess("Scores saved successfully!");
      await fetchTrackerClientData(payload.client_id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleQuickUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const applicationId = Number(quickUpdateForm.application_id);
      const payload: Record<string, unknown> = {
        status: quickUpdateForm.status,
        current_stage: quickUpdateForm.current_stage,
        next_action: quickUpdateForm.next_action,
        next_action_date: quickUpdateForm.next_action_date || null,
        notes: quickUpdateForm.notes,
        is_saved: quickUpdateForm.status === "saved",
        is_active: !["hired", "rejected", "withdrawn", "closed"].includes(quickUpdateForm.status),
      };

      if (quickUpdateForm.status === "offer_received") payload.offer_received_at = new Date().toISOString();
      if (quickUpdateForm.status === "hired") payload.hired_at = new Date().toISOString();

      const currentApplication = applications.find((application) => application.id === applicationId);
      const { error } = await supabase.from("applications").update(payload).eq("id", applicationId);
      if (error) throw error;

      await logActivity(currentApplication?.user_id || selectedTrackerClientId, applicationId, "application_quick_update", "Application quick updated", "Status and next action updated from quick update modal.", currentApplication ?? null, payload);
      showSuccess("Application updated successfully!");
      await fetchTrackerClientData(currentApplication?.user_id || selectedTrackerClientId);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      if (table === "profiles") {
        const token = await ensureAdminToken();
        if (token) {
          const response = await fetch(`${BACKEND_URL}/api/admin/personal-info/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
          }
        }

        const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);
        if (profileError && !isRowLevelSecurityError(profileError) && !isMissingRelationError(profileError)) {
          throw profileError;
        }

        const { error: subscriptionError } = await supabase.from("user_subscriptions").delete().eq("user_id", id);
        if (subscriptionError && !isRowLevelSecurityError(subscriptionError) && !isMissingRelationError(subscriptionError)) {
          throw subscriptionError;
        }

        showSuccess("Item deleted successfully.");
        await fetchUsers();
        return;
      }

      if (table === "success_stories") {
        try {
          const token = await ensureAdminToken();
          if (!token) {
            throw new Error("Admin auth token missing. Please sign in again.");
          }

          const res = await fetch(`${BACKEND_URL}/api/admin/success-stories/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const errorPayload = await res.json().catch(() => null);
            throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
          }
        } catch (backendError) {
          console.warn("handleDelete success_stories backend delete failed, falling back to Supabase delete:", backendError);
          const { error } = await supabase.from("success_stories").delete().eq("id", id);
          if (error) {
            if (isMissingRelationError(error)) {
              deleteLocalSuccessStoryRecord(id);
            } else {
              throw error;
            }
          }
        }

        showSuccess("Item deleted successfully.");
        await fetchSuccessStories();
        return;
      }

      if (table === "recruiter_contacts") {
        const token = await ensureAdminToken();
        if (!token) {
          throw new Error("Admin auth token missing. Please sign in again.");
        }

        const res = await fetch(`${BACKEND_URL}/api/admin/tracker/contacts/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null);
          throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
        }

        showSuccess("Item deleted successfully.");
        if (selectedTrackerClientId) {
          await fetchTrackerClientData(selectedTrackerClientId);
        }
        return;
      }

      if (table === "notifications") {
        const token = await ensureAdminToken();
        if (!token) {
          throw new Error("Admin auth token missing. Please sign in again.");
        }

        const res = await fetch(`${BACKEND_URL}/api/admin/notifications/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null);
          throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
        }

        showSuccess("Item deleted successfully.");
        fetchNotifications();
        return;
      }

      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      showSuccess("Item deleted successfully.");
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteSavedJob = async (entry: any) => {
    if (!confirm("Are you sure you want to delete this saved job?")) return;

    try {
      const token = await ensureAdminToken();
      if (!token) {
        throw new Error("Admin auth token missing. Please sign in again.");
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/tracker/saved-jobs`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId: entry.application_id || null,
          jobId: entry.job_id,
          userId: entry.user_id,
          status: entry.status || "saved",
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `HTTP error ${response.status}`);
      }

      showSuccess("Saved job deleted successfully.");
      await Promise.all([fetchUsers(), fetchSavedJobs()]);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUpdateApplicationStatus = async (appId: number, status: string) => {
    try {
      const patch: Record<string, unknown> = {
        status,
        current_stage: status,
        is_saved: status === "saved",
        is_active: !["hired", "rejected", "withdrawn", "closed"].includes(status),
      };
      if (status === "offer_received") patch.offer_received_at = new Date().toISOString();
      if (status === "hired") patch.hired_at = new Date().toISOString();
      const targetApplication = applications.find((application) => application.id === appId);
      const { error } = await supabase.from("applications").update(patch).eq("id", appId);
      if (error) throw error;
      if (targetApplication) {
        await logActivity(targetApplication.user_id, appId, "status_changed", "Application status changed", `Application moved to ${status}.`, targetApplication, patch);
      }
      showSuccess("Application tracker status updated!");
      if (selectedTrackerClientId) {
        await fetchTrackerClientData(selectedTrackerClientId);
      } else {
        fetchApplications();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleToggleService = async (serviceId: string, updates: Partial<any>) => {
    try {
      const { error } = await supabase.from("services").update(updates).eq("id", serviceId);
      if (error) throw error;
      showSuccess("Service updated successfully.");
      fetchServices();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatUser) return;

    const trimmedText = chatInput.trim();
    const clientMessageId = "msg_admin_" + Math.random().toString(36).substring(2) + "_" + Date.now();

    try {
      const token = localStorage.getItem("admin_auth_token");
      const res = await fetch(`http://localhost:3000/api/admin/conversations/${activeChatUser.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          text: trimmedText,
          clientMessageId
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      setChatInput("");
      fetchChatMessages(activeChatUser.id);
    } catch (err: any) {
      console.warn("handleSendChatMessage backend call failed, falling back to direct Supabase insert:", err);
      try {
        const { error } = await supabase.from("messages").insert([
          {
            conversation_id: activeChatUser.id,
            sender_id: "admin",
            sender_role: "admin",
            recipient_id: activeChatUser.id,
            message_type: "text",
            text: trimmedText,
            status: "sent"
          }
        ]);
        if (error) throw error;

        setChatInput("");
        fetchChatMessages(activeChatUser.id);
      } catch (dbErr: any) {
        try {
          const { error: fallbackError } = await supabase.from("messages").insert([
            {
              sender_id: "admin",
              recipient_id: activeChatUser.id,
              content: trimmedText
            }
          ]);
          if (fallbackError) throw fallbackError;

          setChatInput("");
          fetchChatMessages(activeChatUser.id);
        } catch (fallbackErr: any) {
          showError(fallbackErr.message);
        }
      }
    }
  };


  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setIsModalOpen(false);
    setEditItem(null);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(toAdminErrorMessage({ message: msg }));
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const openAddModal = (type: any) => {
    setModalType(type);
    setEditItem(null);
    setErrorMsg("");
    const defaultSavedJobUserId =
      type === "job" && activeTab === "saved_jobs"
        ? selectedTrackerClientId || users[0]?.id || previewTrackerClient.id
        : "";
    // Clear forms
    setUserForm({
      id: "",
      full_name: "",
      email: "",
      phone_number: "",
      location: "",
      headline: "",
      avatar_url: "",
      linkedin_url: "",
      facebook_url: "",
      instagram_url: "",
      twitter_url: "",
      subscription_plan: "free",
    });
    setJobForm({ id: "", title: "", company: "", location: "", salary: "", job_type: "Full-time", description: "", tags: "", job_link: "", user_id: defaultSavedJobUserId, application_id: "" });
    setPlanForm({ id: "", name: "", price: "", features: "" });
    setNotificationForm({ title: "", body: "", user_id: "", status: "sent" });
    setResumeForm({ user_id: "", score: 70, suggestions: "", notes: "" });
    setTrackerForm({ user_id: selectedTrackerClientId || "", job_id: "", status: "applied" });
    setInterviewForm({ client_id: selectedTrackerClientId || "", application_id: "", interview_type: "video", interview_round: "", interview_date: "", status: "scheduled", interviewer_name: "", interviewer_email: "", admin_notes: "" });
    setFollowUpForm({ client_id: selectedTrackerClientId || "", application_id: "", follow_up_type: "email", due_date: "", status: "pending", contact_person: "", contact_email: "", notes: "" });
    setContactForm({ client_id: selectedTrackerClientId || "", application_id: "", recruiter_name: "", position: "", email: "", linkedin_url: "", contact_date: "", response_status: "no_response", notes: "" });
    setColdEmailForm({ client_id: selectedTrackerClientId || "", application_id: "", recipient_name: "", recipient_email: "", company_name: "", subject: "", message: "", sent_at: "", delivery_status: "sent", response_status: "no_response" });
    setScoreForm({ client_id: selectedTrackerClientId || "", application_id: "", ats_score: 0, ai_match_score: 0, score_reason: "", recommendations: "" });
    setQuickUpdateForm({ application_id: "", status: "applied", current_stage: "applied", next_action: "", next_action_date: "", notes: "" });
    setSuccessStoryForm({ id: "", name: "", position: "", year: "", message: "", story_rate: 5, photo_url: "", display_order: successStories.length, is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (type: any, item: any) => {
    setModalType(type);
    setEditItem(item);
    setErrorMsg("");
    setIsModalOpen(true);

    if (type === "user") {
      setUserForm({
        id: item.id,
        full_name: item.full_name || "",
        email: item.email || "",
        phone_number: item.phone_number || "",
        location: item.location || "",
        headline: item.headline || "",
        avatar_url: item.avatar_url || "",
        linkedin_url: item.linkedin_url || "",
        facebook_url: item.facebook_url || "",
        instagram_url: item.instagram_url || "",
        twitter_url: item.twitter_url || "",
        subscription_plan: item.subscription_plan || "free",
      });
    } else if (type === "job") {
      setJobForm({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        salary: item.salary,
        job_type: item.job_type,
        description: item.description,
        tags: item.tags?.join(", ") || "",
        job_link: item.job_link || "",
        user_id: item.user_id || item.client_id || "",
        application_id: item.application_id ? String(item.application_id) : "",
      });
    } else if (type === "plan") {
      setPlanForm({ id: item.id, name: item.name, price: item.price, features: item.features?.join(", ") || "" });
    } else if (type === "notification") {
      setNotificationForm({
        title: item.title || "",
        body: item.body || "",
        user_id: item.user_id || "",
        status: item.status || "sent",
      });
    } else if (type === "resume") {
      setResumeForm({ user_id: item.user_id, score: item.score, suggestions: item.suggestions?.join(", ") || "", notes: item.notes || "" });
    } else if (type === "tracker") {
      setTrackerForm({ user_id: item.user_id, job_id: item.job_id, status: item.status || "applied" });
    } else if (type === "interview") {
      setInterviewForm({ client_id: item.client_id, application_id: String(item.application_id), interview_type: item.interview_type || "video", interview_round: item.interview_round || "", interview_date: item.interview_date || "", status: item.status || "scheduled", interviewer_name: item.interviewer_name || "", interviewer_email: item.interviewer_email || "", admin_notes: item.admin_notes || "" });
    } else if (type === "follow_up") {
      setFollowUpForm({ client_id: item.client_id, application_id: String(item.application_id), follow_up_type: item.follow_up_type || "email", due_date: item.due_date || "", status: item.status || "pending", contact_person: item.contact_person || "", contact_email: item.contact_email || "", notes: item.notes || "" });
    } else if (type === "contact") {
      setContactForm({ client_id: item.client_id, application_id: item.application_id ? String(item.application_id) : "", recruiter_name: item.recruiter_name || "", position: item.company_name || "", email: item.email || "", linkedin_url: item.linkedin_url || "", contact_date: item.contact_date || "", response_status: item.response_status || "no_response", notes: item.notes || "" });
    } else if (type === "cold_email") {
      setColdEmailForm({ client_id: item.client_id, application_id: item.application_id ? String(item.application_id) : "", recipient_name: item.recipient_name || "", recipient_email: item.recipient_email || "", company_name: item.company_name || "", subject: item.subject || "", message: item.message || "", sent_at: item.sent_at || "", delivery_status: item.delivery_status || "sent", response_status: item.response_status || "no_response" });
    } else if (type === "score") {
      setScoreForm({ client_id: item.client_id, application_id: item.application_id ? String(item.application_id) : "", ats_score: item.ats_score || 0, ai_match_score: item.ai_match_score || 0, score_reason: item.score_reason || "", recommendations: item.recommendations?.join(", ") || "" });
    } else if (type === "quick_update") {
      setQuickUpdateForm({ application_id: String(item.id), status: item.status || "applied", current_stage: item.current_stage || item.status || "applied", next_action: item.next_action || "", next_action_date: item.next_action_date || "", notes: item.notes || "" });
    } else if (type === "success_story") {
      setSuccessStoryForm({
        id: item.id || "",
        name: item.name || "",
        position: item.position || "",
        year: item.year || "",
        message: item.message || "",
        story_rate: item.story_rate || 5,
        photo_url: item.photo_url || "",
        display_order: item.display_order || 0,
        is_active: item.is_active !== false,
      });
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = u.full_name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
    if (filterType === "all") return matchesSearch;
    return matchesSearch && u.subscription_plan === filterType;
  });

  const filteredJobs = jobs.filter((j) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = j.title?.toLowerCase().includes(query) || j.company?.toLowerCase().includes(query) || j.location?.toLowerCase().includes(query);
    if (filterType === "all") return matchesSearch;
    return matchesSearch && j.job_type === filterType;
  });

  const filteredApplications = applications.filter((a) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      a.profiles?.full_name?.toLowerCase().includes(query) ||
      a.jobs?.title?.toLowerCase().includes(query) ||
      a.job_title?.toLowerCase?.().includes(query) ||
      a.company_name?.toLowerCase?.().includes(query) ||
      selectedTrackerClient?.full_name?.toLowerCase().includes(query) ||
      selectedTrackerClient?.email?.toLowerCase().includes(query);
    if (filterType === "all") return matchesSearch;
    return matchesSearch && a.status === filterType;
  });

  const filteredSavedJobs = savedJobEntries.filter((application) => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      return true;
    }

    return [
      application.profiles?.full_name,
      application.profiles?.email,
      application.jobs?.title,
      application.jobs?.company,
      application.jobs?.location,
      application.job_title,
      application.company_name,
      application.job_location,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  const filteredSuccessStories = successStories.filter((story) => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      return true;
    }

    return [story.name, story.position, story.year, story.message]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });


  const selectedTrackerClient = users.find((candidate) => candidate.id === selectedTrackerClientId) || null;
  const buildSavedJobModalItem = (item: any, title: string, company: string, location: string, salary: string, tags: string[], jobLink: string) => ({
    ...(item.jobs || {}),
    id: item.job_id,
    title,
    company,
    location,
    salary,
    job_type: item.jobs?.job_type || item.employment_type || "Full-time",
    description: item.jobs?.description || item.job_description || "",
    tags: Array.isArray(item.jobs?.tags) ? item.jobs.tags : tags,
    job_link: item.jobs?.job_link || jobLink,
    user_id: item.user_id,
    client_id: item.client_id,
    application_id: item.application_id ? String(item.application_id) : "",
    status: item.status || "saved",
    current_stage: item.current_stage || item.status || "saved",
    application_date: item.application_date || item.created_at,
    applied_at: item.applied_at || null,
  });
  const selectedTrackerMetrics = calculateTrackerMetrics({
    applications,
    interviews: trackerInterviews,
    followUps: trackerFollowUps,
    recruiterContacts: trackerContacts,
    coldEmails: trackerColdEmails,
    scores: trackerScores,
    timezone: selectedTrackerClient?.timezone || "Australia/Melbourne",
  });

  const modalHeading = modalType === "contact"
    ? `${editItem ? "Edit" : "Create"} Hiring Manager`
    : modalType === "success_story"
      ? `${editItem ? "Edit" : "Create"} Success Story`
      : `${editItem ? "Edit " : "Create "}${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`;

  // Protected Auth Screen
  if (!(isPreviewAuthenticated || (isSignedIn && isAdmin))) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="https://hzpzpdjmmuoesxhmdiqn.supabase.co/storage/v1/object/public/assets/logo.png" onError={(e) => { e.currentTarget.src = "https://placehold.co/60x60/000000/ffffff?text=9JOBS" }} alt="9Jobs Logo" />
            <h1>9Jobs Admin</h1>
          </div>
          <h3>System Credentials</h3>
          <p>Use the fixed local preview credentials for the 9Jobs admin panel.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: "left" }}>
              <label className="form-label" style={{ color: "#AAA" }}>Admin Email</label>
              <input
                type="email"
                className="form-input"
                style={{ backgroundColor: "#1e1e1e", color: "white", borderColor: "#333" }}
                value={emailInput}
                readOnly
                required
              />
            </div>
            <div className="form-group" style={{ textAlign: "left" }}>
              <label className="form-label" style={{ color: "#AAA" }}>Secret Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ backgroundColor: "#1e1e1e", color: "white", borderColor: "#333", paddingRight: "45px" }}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {authError && <div style={{ color: "#FF4D4D", fontSize: "14px", marginBottom: "16px" }}>{authError}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={authLoading}>
              {authLoading ? <Loader2 className="animate-spin" size={18} /> : "Authenticate Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Toast Messages */}
      {successMsg && (
        <div style={{ position: "fixed", top: "24px", right: "24px", backgroundColor: "#A3E635", color: "#000", padding: "12px 24px", borderRadius: "10px", fontWeight: "600", zIndex: 2000, boxShadow: "0 8px 30px rgba(163,230,53,0.3)" }}>
          {successMsg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Shield size={28} style={{ color: "var(--accent)" }} />
          <h1>9Jobs Admin</h1>
        </div>

        <nav className="sidebar-menu">
          <a className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
          <a className={`sidebar-item ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
            <Users size={18} />
            <span>Users</span>
          </a>
          <a className={`sidebar-item ${activeTab === "jobs" ? "active" : ""}`} onClick={() => setActiveTab("jobs")}>
            <Briefcase size={18} />
            <span>Opportunities</span>
          </a>
          <a className={`sidebar-item ${activeTab === "saved_jobs" ? "active" : ""}`} onClick={() => setActiveTab("saved_jobs")}>
            <Eye size={18} />
            <span>Saved Jobs</span>
          </a>
          <a className={`sidebar-item ${activeTab === "success_stories" ? "active" : ""}`} onClick={() => setActiveTab("success_stories")}>
            <Star size={18} />
            <span>Success Stories</span>
          </a>
          <a className={`sidebar-item ${activeTab === "applications" ? "active" : ""}`} onClick={() => setActiveTab("applications")}>
            <Layers size={18} />
            <span>Applications</span>
          </a>
          <a className={`sidebar-item ${activeTab === "job_tracker" ? "active" : ""}`} onClick={() => setActiveTab("job_tracker")}>
            <Layers size={18} />
            <span>Job Tracker</span>
          </a>
          <a className={`sidebar-item ${activeTab === "hiring_managers" ? "active" : ""}`} onClick={() => setActiveTab("hiring_managers")}>
            <Users size={18} />
            <span>Hiring Managers</span>
          </a>
          <a className={`sidebar-item ${activeTab === "interview_preparation" ? "active" : ""}`} onClick={() => setActiveTab("interview_preparation")}>
            <Sparkles size={18} />
            <span>Interview Preparation</span>
          </a>
          <a className={`sidebar-item ${activeTab === "messages" ? "active" : ""}`} onClick={() => setActiveTab("messages")}>
            <MessageSquare size={18} />
            <span>Messages</span>
          </a>
          <a className={`sidebar-item ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")}>
            <Sparkles size={18} />
            <span>Services</span>
          </a>
          <a className={`sidebar-item ${activeTab === "resume_ai" ? "active" : ""}`} onClick={() => setActiveTab("resume_ai")}>
            <FileText size={18} />
            <span>Resume AI</span>
          </a>
          <a className={`sidebar-item ${activeTab === "subscriptions" ? "active" : ""}`} onClick={() => setActiveTab("subscriptions")}>
            <DollarSign size={18} />
            <span>Subscriptions</span>
          </a>
          <div>
            <a
              className={`sidebar-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                setIsSettingsDropdownOpen((prev) => (activeTab === "settings" ? !prev : true));
              }}
            >
              <Settings size={18} />
              <span style={{ flex: 1 }}>Settings</span>
              <span style={{ fontSize: "12px", opacity: 0.9 }}>{isSettingsDropdownOpen ? "▾" : "▸"}</span>
            </a>
            {isSettingsDropdownOpen && (
              <div style={{ marginTop: "8px", paddingLeft: "22px", display: "grid", gap: "8px" }}>
                <a
                  className={`sidebar-item ${activeTab === "settings" && settingsSubsection === "personal_information" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("settings");
                    setSettingsSubsection("personal_information");
                    setIsSettingsDropdownOpen(true);
                  }}
                  style={{ minHeight: "48px", fontSize: "14px" }}
                >
                  <User size={16} />
                  <span>Personal Information</span>
                </a>
                <a
                  className={`sidebar-item ${activeTab === "settings" && settingsSubsection === "notifications" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("settings");
                    setSettingsSubsection("notifications");
                    setIsSettingsDropdownOpen(true);
                  }}
                  style={{ minHeight: "48px", fontSize: "14px" }}
                >
                  <Bell size={16} />
                  <span>Notifications</span>
                </a>
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <User size={18} style={{ color: "#FFF" }} />
            <div className="sidebar-user-info">
              <h4>Administrator</h4>
              <p>{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h2>{activeTab === "job_tracker" ? "Job Tracker" : activeTab === "saved_jobs" ? "Saved Jobs" : activeTab === "success_stories" ? "Success Stories" : activeTab === "hiring_managers" ? "Hiring Managers" : activeTab === "interview_preparation" ? "Interview Preparation" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace("_", " ")}</h2>
            <p>Welcome back to your 9Jobs administration console.</p>
          </div>
          <div className="header-actions">
            {activeTab === "users" && <button className="btn btn-primary" onClick={() => openAddModal("user")}><Plus size={16} /> Add Candidate</button>}
            {activeTab === "jobs" && <button className="btn btn-primary" onClick={() => openAddModal("job")}><Plus size={16} /> Add Opportunity</button>}
            {activeTab === "saved_jobs" && <button className="btn btn-primary" onClick={() => openAddModal("job")}><Plus size={16} /> Add Saved Job</button>}
            {activeTab === "success_stories" && <button className="btn btn-primary" onClick={() => openAddModal("success_story")}><Plus size={16} /> Add Success Story</button>}
            {activeTab === "job_tracker" && <button className="btn btn-primary" onClick={() => openAddModal("tracker")}><Plus size={16} /> Add Tracker Entry</button>}
            {activeTab === "hiring_managers" && <button className="btn btn-primary" onClick={() => openAddModal("contact")} disabled={!selectedTrackerClientId}><Plus size={16} /> Add Hiring Manager</button>}
            {activeTab === "interview_preparation" && <button className="btn btn-primary" onClick={() => void fetchInterviewPreparationData(selectedTrackerClientId || undefined)}><Plus size={16} /> Refresh</button>}
            {activeTab === "subscriptions" && <button className="btn btn-primary" onClick={() => openAddModal("plan")}><Plus size={16} /> Add Pricing Plan</button>}
            {activeTab === "settings" && settingsSubsection === "notifications" && <button className="btn btn-primary" onClick={() => openAddModal("notification")}><Plus size={16} /> Add Notification</button>}
            {activeTab === "settings" && settingsSubsection === "personal_information" && <button className="btn btn-primary" onClick={() => openAddModal("user")}><Plus size={16} /> Add Personal Information</button>}
          </div>
        </header>

        {schemaWarning ? (
          <div className="card" style={{ marginBottom: "24px", borderColor: "#F59E0B", backgroundColor: "#FFF8E6" }}>
            <strong style={{ display: "block", marginBottom: "6px" }}>Live Sync Setup Required</strong>
            <span style={{ color: "#7C5A10" }}>{schemaWarning}</span>
          </div>
        ) : null}

        {/* Dashboard Tab Content */}
        {activeTab === "dashboard" && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Users size={22} /></div>
                <div className="stat-value">{stats.usersCount}</div>
                <div className="stat-label">Total Registered Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Briefcase size={22} /></div>
                <div className="stat-value">{stats.jobsCount}</div>
                <div className="stat-label">Live Opportunities</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Layers size={22} /></div>
                <div className="stat-value">{stats.applicationsCount}</div>
                <div className="stat-label">Tracked Applications</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><DollarSign size={22} /></div>
                <div className="stat-value">{stats.activeSubscriptionsCount}</div>
                <div className="stat-label">Active Pro Subscribers</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><MessageSquare size={22} /></div>
                <div className="stat-value">{stats.messagesCount}</div>
                <div className="stat-label">Chat Messages Logged</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Recent Candidate Opportunities</h3></div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Company</th><th>Title</th><th>Location</th><th>Salary</th></tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 5).map((j) => (
                        <tr key={j.id}>
                          <td><strong>{j.company}</strong></td>
                          <td>{j.title}</td>
                          <td>{j.location}</td>
                          <td><span className="badge badge-success">{j.salary}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Service Maintenance Toggles</h3></div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Service</th><th>Status</th><th>Visible</th></tr>
                    </thead>
                    <tbody>
                      {services.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.title}</strong></td>
                          <td>
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={s.status === "active"}
                                onChange={(e) => handleToggleService(s.id, { status: e.target.checked ? "active" : "inactive" })}
                              />
                              <span className="slider"></span>
                            </label>
                          </td>
                          <td>
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={s.visibility}
                                onChange={(e) => handleToggleService(s.id, { visibility: e.target.checked })}
                              />
                              <span className="slider"></span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab Content */}
        {activeTab === "users" && (
          <div className="card">
            <div className="controls-row">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search candidates by name or email..."
                  className="form-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Filter size={16} style={{ color: "var(--text-secondary)" }} />
                <select className="form-input" style={{ width: "160px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Plans</option>
                  <option value="free">Free Starter</option>
                  <option value="pro">Pro Candidate</option>
                  <option value="elite">Elite Premium</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Avatar</th><th>Client</th><th>Phone</th><th>Status</th><th>Assigned Consultant</th><th>Total Applications</th><th>Active Roles</th><th>Interviews</th><th>Offers</th><th>Hired</th><th>Last Activity</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td><img src={u.avatar_url || "https://randomuser.me/api/portraits/men/32.jpg"} alt="" className="chat-user-item-avatar" /></td>
                      <td><strong>{u.full_name}</strong><br /><span style={{ fontSize: "11px", color: "#888" }}>{u.email}</span></td>
                      <td>{u.phone_number || "—"}</td>
                      <td>
                        <span className={`badge ${u.account_status === "active" ? "badge-success" : u.account_status === "suspended" ? "badge-danger" : "badge-neutral"}`}>
                          {u.account_status || "active"}
                        </span>
                      </td>
                      <td>{u.assigned_consultant_id || "Unassigned"}</td>
                      <td><strong>{u.totalApplications ?? 0}</strong></td>
                      <td><strong>{u.activeRoles ?? 0}</strong></td>
                      <td><strong>{u.interviewsCount ?? 0}</strong></td>
                      <td><strong>{u.offersCount ?? 0}</strong></td>
                      <td><strong>{u.hiredCount ?? 0}</strong></td>
                      <td>{u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleString() : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button className="btn btn-dark" style={{ padding: "6px 10px" }} onClick={() => { setSelectedTrackerClientId(u.id); setActiveTab("job_tracker"); }} title="Open Tracker">Open Tracker</button>
                          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("user", u)} title="Edit User"><Edit size={14} /></button>
                          <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("profiles", u.id)} title="Delete User"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No clients found match search queries.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Jobs Tab Content */}
        {activeTab === "jobs" && (
          <div className="card">
            <div className="controls-row">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search openings by title, company, or city..."
                  className="form-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Filter size={16} style={{ color: "var(--text-secondary)" }} />
                <select className="form-input" style={{ width: "160px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Remote">Remote</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Company</th><th>Job Title</th><th>Location</th><th>Salary</th><th>Type</th><th>Score Match</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j) => (
                    <tr key={j.id}>
                      <td><strong>{j.company}</strong></td>
                      <td>{j.title}</td>
                      <td>{j.location}</td>
                      <td><span className="badge badge-success">{j.salary}</span></td>
                      <td><span className="badge badge-info">{j.job_type}</span></td>
                      <td><strong>{j.match_score}%</strong></td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("job", j)}><Edit size={14} /></button>
                          <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("jobs", j.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No opportunities listed matching search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "saved_jobs" && (
          <div className="card">
            <div className="controls-row">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search saved jobs by candidate, company, or role..."
                  className="form-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: "20px" }}>
              <div className="stat-card">
                <div className="stat-value">{savedJobEntries.length}</div>
                <div className="stat-label">Total Saved Jobs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{new Set(savedJobEntries.map((item) => item.user_id)).size}</div>
                <div className="stat-label">Candidates With Saves</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{filteredSavedJobs.length}</div>
                <div className="stat-label">Visible In Current Filter</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
              {filteredSavedJobs.map((item) => {
                const savedJob = item.jobs || {};
                const title = savedJob.title || item.job_title || "Saved role";
                const company = savedJob.company || item.company_name || "9Jobs";
                const location = savedJob.location || item.job_location || "Australia";
                const salary = savedJob.salary || item.salary_range || "Not disclosed";
                const jobLink = savedJob.job_link || item.source_url || "";
                const tags = Array.isArray(savedJob.tags) ? savedJob.tags.slice(0, 3) : [];

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--surface-color)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "24px",
                      padding: "22px",
                      boxShadow: "0 14px 34px rgba(10, 10, 8, 0.08)",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          {item.profiles?.full_name || "Candidate"}
                        </div>
                        <h3 style={{ fontSize: "22px", lineHeight: 1.2, margin: 0 }}>{title}</h3>
                        <p style={{ margin: "8px 0 0", color: "var(--text-secondary)" }}>{company} • {location}</p>
                      </div>
                      <span className="badge badge-success">{item.status || "saved"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Salary</div>
                        <strong style={{ fontSize: "18px" }}>{salary}</strong>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {tags.map((tag: string) => (
                          <span key={tag} className="badge badge-neutral">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {jobLink ? (
                        <a className="btn btn-dark" href={jobLink} target="_blank" rel="noreferrer">
                          <Eye size={16} /> View Job
                        </a>
                      ) : (
                        <button className="btn btn-dark" onClick={() => openEditModal("job", buildSavedJobModalItem(item, title, company, location, salary, tags, jobLink))}>
                          <Eye size={16} /> View Job
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => { setSelectedTrackerClientId(item.user_id); setActiveTab("job_tracker"); }}>
                        Open Tracker
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openEditModal("job", buildSavedJobModalItem(item, title, company, location, salary, tags, jobLink))}
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button className="btn btn-danger" onClick={() => void handleDeleteSavedJob(item)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredSavedJobs.length === 0 && (
                <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-secondary)" }}>
                  No saved jobs found yet. Save a role for a candidate and it will appear here.
                </div>
              )}
            </div>

            <div className="table-responsive" style={{ marginTop: "24px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Company</th>
                    <th>Job Title</th>
                    <th>Status</th>
                    <th>Salary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedJobs.map((item) => {
                    const savedJob = item.jobs || {};
                    const title = savedJob.title || item.job_title || "Saved role";
                    const company = savedJob.company || item.company_name || "9Jobs";
                    const salary = savedJob.salary || item.salary_range || "Not disclosed";
                    const location = savedJob.location || item.job_location || "Australia";
                    const jobLink = savedJob.job_link || item.source_url || "";
                    const tags = Array.isArray(savedJob.tags) ? savedJob.tags.slice(0, 3) : [];

                    return (
                      <tr key={`table-${item.id}`}>
                        <td>
                          <strong>{item.profiles?.full_name || "Candidate"}</strong>
                          <br />
                          <span style={{ fontSize: "11px", color: "#888" }}>{item.profiles?.email || item.user_id}</span>
                        </td>
                        <td>{company}</td>
                        <td>
                          <strong>{title}</strong>
                          <br />
                          <span style={{ fontSize: "11px", color: "#888" }}>{location}</span>
                        </td>
                        <td><span className="badge badge-success">{item.status || "saved"}</span></td>
                        <td>{salary}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {jobLink ? (
                              <a className="btn btn-dark" style={{ padding: "6px 10px" }} href={jobLink} target="_blank" rel="noreferrer">
                                <Eye size={14} />
                              </a>
                            ) : (
                              <button className="btn btn-dark" style={{ padding: "6px 10px" }} onClick={() => openEditModal("job", buildSavedJobModalItem(item, title, company, location, salary, tags, jobLink))}>
                                <Eye size={14} />
                              </button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: "6px 10px" }} onClick={() => openEditModal("job", buildSavedJobModalItem(item, title, company, location, salary, tags, jobLink))}>
                              <Edit size={14} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => void handleDeleteSavedJob(item)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSavedJobs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                        No saved jobs available in table view yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "success_stories" && (
          <div className="card">
            <div className="controls-row">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search stories by name, position, year, or message..."
                  className="form-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: "20px" }}>
              <div className="stat-card">
                <div className="stat-value">{successStories.length}</div>
                <div className="stat-label">Total Stories</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{successStories.filter((story) => story.is_active !== false).length}</div>
                <div className="stat-label">Active In App</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{filteredSuccessStories.length}</div>
                <div className="stat-label">Visible In Current Filter</div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Year</th>
                    <th>Message</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuccessStories.map((story) => (
                    <tr key={story.id}>
                      <td><img src={story.photo_url || "https://placehold.co/52x52/F3F4F6/111111?text=SS"} alt="" className="chat-user-item-avatar" /></td>
                      <td><strong>{story.name}</strong></td>
                      <td>{story.position}</td>
                      <td>{story.year}</td>
                      <td style={{ maxWidth: "280px" }}>{story.message}</td>
                      <td>{"★".repeat(Math.max(1, Math.min(5, Number(story.story_rate || 5))))}</td>
                      <td>
                        <span className={`badge ${story.is_active !== false ? "badge-success" : "badge-neutral"}`}>
                          {story.is_active !== false ? "active" : "hidden"}
                        </span>
                      </td>
                      <td>{story.display_order ?? 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("success_story", story)} title="Edit Story"><Edit size={14} /></button>
                          <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("success_stories", story.id)} title="Delete Story"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSuccessStories.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                        No success stories available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications Tab Content */}
        {activeTab === "applications" && (
          <div className="card">
            <div className="controls-row">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search tracker by candidate name or job title..."
                  className="form-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Filter size={16} style={{ color: "var(--text-secondary)" }} />
                <select className="form-input" style={{ width: "160px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Stages</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer Received</option>
                  <option value="saved">Saved/Postponed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Candidate</th><th>Job Title</th><th>Company</th><th>Tracker Status</th><th>Applied Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredApplications.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.profiles?.full_name}</strong><br /><span style={{ fontSize: "11px", color: "#888" }}>{a.profiles?.email}</span></td>
                      <td>{a.jobs?.title}</td>
                      <td>{a.jobs?.company}</td>
                      <td>
                        <select
                          className="form-input"
                          style={{ width: "150px", padding: "6px 12px" }}
                          value={a.status}
                          onChange={(e) => handleUpdateApplicationStatus(a.id, e.target.value)}
                        >
                          <option value="saved">Saved</option>
                          <option value="applied">Applied</option>
                          <option value="interviewing">Interviewing</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("applications", String(a.id))}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No applications logged.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "job_tracker" && (
          <div style={{ display: "grid", gap: "24px" }}>
            <div className="card" id="admin-personal-information">
              <div className="controls-row" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Select Client</label>
                  <select className="form-input" value={selectedTrackerClientId} onChange={(e) => setSelectedTrackerClientId(e.target.value)}>
                    <option value="">Choose client</option>
                    {users.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name} ({candidate.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={() => openAddModal("tracker")} disabled={!selectedTrackerClientId}><Plus size={16} /> Application</button>
                  <button className="btn btn-secondary" onClick={() => openAddModal("interview")} disabled={!selectedTrackerClientId}>Interview</button>
                  <button className="btn btn-secondary" onClick={() => openAddModal("follow_up")} disabled={!selectedTrackerClientId}>Follow-up</button>
                  <button className="btn btn-secondary" onClick={() => { setTrackerSection("contacts"); openAddModal("contact"); }} disabled={!selectedTrackerClientId}>Hiring Manager</button>
                  <button className="btn btn-secondary" onClick={() => openAddModal("cold_email")} disabled={!selectedTrackerClientId}>Cold Email</button>
                  <button className="btn btn-secondary" onClick={() => openAddModal("score")} disabled={!selectedTrackerClientId}>Score</button>
                </div>
              </div>
              {selectedTrackerClient ? (
                <div style={{ marginTop: "18px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Tracking <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerClient.full_name}</strong> with live dashboard preview synced to the mobile app.
                </div>
              ) : null}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Layers size={22} /></div>
                <div className="stat-value">{selectedTrackerMetrics.currentFocus.totalActiveRoles}</div>
                <div className="stat-label">Total Active Roles</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Layers size={22} /></div>
                <div className="stat-value">{selectedTrackerMetrics.applied}</div>
                <div className="stat-label">Applied</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><MessageSquare size={22} /></div>
                <div className="stat-value">{selectedTrackerMetrics.interviewing}</div>
                <div className="stat-label">Interviewing</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><DollarSign size={22} /></div>
                <div className="stat-value">{selectedTrackerMetrics.offers}</div>
                <div className="stat-label">Offers</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FileText size={22} /></div>
                <div className="stat-value">{selectedTrackerMetrics.saved}</div>
                <div className="stat-label">Saved</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Client Dashboard Preview</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                {[
                  ["Applications Today", selectedTrackerMetrics.applicationsToday],
                  ["Under Review", selectedTrackerMetrics.underReview],
                  ["Recruiter Contacted", selectedTrackerMetrics.recruiterContacted],
                  ["Shortlisted", selectedTrackerMetrics.shortlisted],
                  ["Interview Completed", selectedTrackerMetrics.interviewCompleted],
                  ["Hired", selectedTrackerMetrics.hired],
                  ["Rejected", selectedTrackerMetrics.rejected],
                  ["Success Rate", `${selectedTrackerMetrics.successRate}%`],
                  ["Response Rate", `${selectedTrackerMetrics.responseRate}%`],
                  ["Follow-ups Due", selectedTrackerMetrics.followUpsDue],
                  ["AI Match Score", `${selectedTrackerMetrics.aiMatchScore}%`],
                  ["ATS Score", `${selectedTrackerMetrics.atsScore}/100`],
                  ["Cold Emails Sent", selectedTrackerMetrics.coldEmailsSent],
                  ["Contacts Reached", selectedTrackerMetrics.contactsReached],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ border: "1px solid var(--border-color)", borderRadius: "18px", padding: "16px 18px", background: "var(--surface)" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: "28px", fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "18px", color: "var(--text-secondary)", fontSize: "14px" }}>
                Current focus: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.currentFocus.message}</strong>
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                {[
                  ["overview", "Overview"],
                  ["applications", "Applications"],
                  ["interviews", "Interviews"],
                  ["follow_ups", "Follow-ups"],
                  ["contacts", "Hiring Managers"],
                  ["cold_emails", "Cold Emails"],
                  ["scores", "Scores"],
                  ["activity", "Activity Timeline"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={trackerSection === value ? "btn btn-primary" : "btn btn-secondary"}
                    style={{ padding: "8px 14px" }}
                    onClick={() => setTrackerSection(value as any)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {trackerSection === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "16px", padding: "18px" }}>
                    <h4 style={{ marginBottom: "10px" }}>Applications Snapshot</h4>
                    <p style={{ color: "var(--text-secondary)" }}>Submitted: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.applied}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Interviewing: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.interviewing}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Offers: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.offers}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Saved: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.saved}</strong></p>
                  </div>
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "16px", padding: "18px" }}>
                    <h4 style={{ marginBottom: "10px" }}>Live Ops Snapshot</h4>
                    <p style={{ color: "var(--text-secondary)" }}>Follow-ups Due: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.followUpsDue}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Cold Emails Sent: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.coldEmailsSent}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Contacts Reached: <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerMetrics.contactsReached}</strong></p>
                    <p style={{ color: "var(--text-secondary)" }}>Last Updated: <strong style={{ color: "var(--text-primary)" }}>{new Date(selectedTrackerMetrics.lastUpdatedAt).toLocaleString()}</strong></p>
                  </div>
                </div>
              )}

              {trackerSection === "applications" && (
                <>
              <div className="controls-row">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search tracker by candidate name or job title..."
                    className="form-input search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <Filter size={16} style={{ color: "var(--text-secondary)" }} />
                  <select className="form-input" style={{ width: "190px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">All Stages</option>
                    {applicationStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Next Action</th>
                      <th>Applied Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{selectedTrackerClient?.full_name || a.profiles?.full_name}</strong>
                          <br />
                          <span style={{ fontSize: "11px", color: "#888" }}>{selectedTrackerClient?.email || a.profiles?.email}</span>
                        </td>
                        <td>{a.job_title || a.jobs?.title}</td>
                        <td>{a.company_name || a.jobs?.company}</td>
                        <td>
                          <select
                            className="form-input"
                            style={{ width: "190px", padding: "6px 12px" }}
                            value={a.status}
                            onChange={(e) => handleUpdateApplicationStatus(a.id, e.target.value)}
                          >
                            {applicationStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>{a.next_action || "—"}</td>
                        <td>{new Date(a.application_date || a.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("tracker", a)} title="Edit tracker">
                              <Edit size={14} />
                            </button>
                            <button className="btn btn-dark" style={{ padding: "6px" }} onClick={() => openEditModal("quick_update", a)} title="Quick update">
                              <Eye size={14} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("applications", String(a.id))} title="Delete tracker">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredApplications.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No tracker records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}

              {trackerSection === "interviews" && (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Type</th><th>Round</th><th>Date</th><th>Status</th><th>Interviewer</th><th>Actions</th></tr></thead>
                    <tbody>
                      {trackerInterviews.map((item) => (
                        <tr key={item.id}>
                          <td>{item.interview_type}</td>
                          <td>{item.interview_round || "—"}</td>
                          <td>{new Date(item.interview_date).toLocaleString()}</td>
                          <td><span className="badge badge-info">{item.status}</span></td>
                          <td>{item.interviewer_name || "—"}</td>
                          <td><div style={{ display: "flex", gap: "8px" }}><button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("interview", item)}><Edit size={14} /></button><button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("interviews", String(item.id))}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                      {trackerInterviews.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No interviews logged.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {trackerSection === "follow_ups" && (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Type</th><th>Due Date</th><th>Status</th><th>Contact</th><th>Notes</th><th>Actions</th></tr></thead>
                    <tbody>
                      {trackerFollowUps.map((item) => (
                        <tr key={item.id}>
                          <td>{item.follow_up_type}</td>
                          <td>{new Date(item.due_date).toLocaleString()}</td>
                          <td><span className="badge badge-warning">{item.status}</span></td>
                          <td>{item.contact_person || item.contact_email || "—"}</td>
                          <td>{item.notes || "—"}</td>
                          <td><div style={{ display: "flex", gap: "8px" }}><button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("follow_up", item)}><Edit size={14} /></button><button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("follow_ups", String(item.id))}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                      {trackerFollowUps.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No follow-ups logged.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {trackerSection === "contacts" && (
                <>
                <div className="controls-row" style={{ marginBottom: "18px" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    Manage hiring managers for <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerClient?.full_name || "selected client"}</strong>.
                    CSV columns: <code>Name</code>, <code>Email</code>, <code>Position</code>, <code>Profile Link</code>.
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      ref={hiringManagersUploadRef}
                      type="file"
                      accept=".csv,text/csv"
                      style={{ display: "none" }}
                      onChange={(event) => void handleHiringManagersUpload(event)}
                    />
                    <button className="btn btn-secondary" onClick={() => hiringManagersUploadRef.current?.click()}>
                      Upload CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => openAddModal("contact")}>
                      <Plus size={16} /> Add Hiring Manager
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Email</th><th>Position</th><th>Response</th><th>Actions</th></tr></thead>
                    <tbody>
                      {trackerContacts.map((item) => (
                        <tr key={item.id}>
                          <td>{item.recruiter_name || "—"}</td>
                          <td>{item.email || "—"}</td>
                          <td>{item.company_name || "—"}</td>
                          <td><span className="badge badge-info">{item.response_status}</span></td>
                          <td><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{item.linkedin_url ? <a className="btn btn-dark" style={{ padding: "6px 10px" }} href={item.linkedin_url} target="_blank" rel="noreferrer">View Profile</a> : <button className="btn btn-dark" style={{ padding: "6px 10px" }} onClick={() => openEditModal("contact", item)}>Add Profile</button>}<button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("contact", item)}><Edit size={14} /></button><button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("recruiter_contacts", String(item.id))}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                      {trackerContacts.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No hiring managers added yet. Select a client, then add Name, Email, Position and LinkedIn profile.</td></tr>}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {trackerSection === "cold_emails" && (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Recipient</th><th>Company</th><th>Subject</th><th>Sent At</th><th>Delivery</th><th>Response</th><th>Actions</th></tr></thead>
                    <tbody>
                      {trackerColdEmails.map((item) => (
                        <tr key={item.id}>
                          <td>{item.recipient_name || item.recipient_email}</td>
                          <td>{item.company_name || "—"}</td>
                          <td>{item.subject}</td>
                          <td>{item.sent_at ? new Date(item.sent_at).toLocaleString() : "—"}</td>
                          <td><span className="badge badge-success">{item.delivery_status}</span></td>
                          <td><span className="badge badge-info">{item.response_status}</span></td>
                          <td><div style={{ display: "flex", gap: "8px" }}><button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("cold_email", item)}><Edit size={14} /></button><button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("cold_emails", String(item.id))}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                      {trackerColdEmails.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No cold emails logged.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {trackerSection === "scores" && (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>ATS Score</th><th>AI Match</th><th>Reason</th><th>Calculated At</th><th>Actions</th></tr></thead>
                    <tbody>
                      {trackerScores.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.ats_score ?? 0}/100</strong></td>
                          <td><strong>{item.ai_match_score ?? 0}%</strong></td>
                          <td>{item.score_reason || "—"}</td>
                          <td>{item.calculated_at ? new Date(item.calculated_at).toLocaleString() : "—"}</td>
                          <td><div style={{ display: "flex", gap: "8px" }}><button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("score", item)}><Edit size={14} /></button><button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("client_scores", String(item.id))}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                      {trackerScores.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No score history available.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {trackerSection === "activity" && (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>When</th><th>Type</th><th>Title</th><th>Description</th><th>By</th></tr></thead>
                    <tbody>
                      {trackerActivities.map((item) => (
                        <tr key={item.id}>
                          <td>{new Date(item.created_at).toLocaleString()}</td>
                          <td>{item.activity_type}</td>
                          <td><strong>{item.title}</strong></td>
                          <td>{item.description || "—"}</td>
                          <td>{item.performed_by || "admin"}</td>
                        </tr>
                      ))}
                      {trackerActivities.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No activity logged yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "hiring_managers" && (
          <div className="card">
            <div className="controls-row" style={{ marginBottom: "20px" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Select Client</label>
                <select className="form-input" value={selectedTrackerClientId} onChange={(e) => setSelectedTrackerClientId(e.target.value)}>
                  <option value="">Choose client</option>
                  {users.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name} ({candidate.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <input
                  ref={hiringManagersUploadRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(event) => void handleHiringManagersUpload(event)}
                />
                <button className="btn btn-secondary" onClick={() => hiringManagersUploadRef.current?.click()} disabled={!selectedTrackerClientId}>
                  Upload CSV
                </button>
                <button className="btn btn-primary" onClick={() => openAddModal("contact")} disabled={!selectedTrackerClientId}>
                  <Plus size={16} /> Add Hiring Manager
                </button>
              </div>
            </div>

            <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
              {selectedTrackerClient
                ? <>Showing hiring managers for <strong style={{ color: "var(--text-primary)" }}>{selectedTrackerClient.full_name}</strong>. Add `Name`, `Email`, `Position` and optional LinkedIn `Profile Link`.</>
                : "Select a client to manage hiring managers and sync them to the mobile app outreach screen."}
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Position</th><th>Response</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {trackerContacts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.recruiter_name || "—"}</td>
                      <td>{item.email || "—"}</td>
                      <td>{item.company_name || "—"}</td>
                      <td><span className="badge badge-info">{item.response_status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {item.linkedin_url ? (
                            <a className="btn btn-dark" style={{ padding: "6px 10px" }} href={item.linkedin_url} target="_blank" rel="noreferrer">
                              View Profile
                            </a>
                          ) : (
                            <button className="btn btn-dark" style={{ padding: "6px 10px" }} onClick={() => openEditModal("contact", item)}>
                              Add Profile
                            </button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("contact", item)}><Edit size={14} /></button>
                          <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("recruiter_contacts", String(item.id))}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trackerContacts.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No hiring managers added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "interview_preparation" && (
          <div className="card">
            <div className="controls-row" style={{ marginBottom: "20px" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Select Client</label>
                <select className="form-input" value={selectedTrackerClientId} onChange={(e) => setSelectedTrackerClientId(e.target.value)}>
                  <option value="">All clients</option>
                  {users.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name} ({candidate.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => void fetchInterviewPreparationData(selectedTrackerClientId || undefined)}>
                  Refresh Data
                </button>
              </div>
            </div>

            <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
              Review live interview preparation sessions, generated AI answers, and coaching scores synced from the mobile app.
            </div>

            <div className="stats-grid" style={{ marginBottom: "24px" }}>
              <div className="stat-card">
                <div className="stat-value">{interviewPrepSessions.length}</div>
                <div className="stat-label">Active Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{interviewPrepResponses.length}</div>
                <div className="stat-label">Generated Answers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {interviewPrepResponses.length > 0
                    ? Math.round(interviewPrepResponses.reduce((sum, item) => sum + (Number(item.clarity_score) || 0), 0) / interviewPrepResponses.length)
                    : 0}
                </div>
                <div className="stat-label">Avg Clarity</div>
              </div>
            </div>

            <div className="table-responsive" style={{ marginBottom: "24px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Current Question</th>
                    <th>Latest Feedback</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {interviewPrepSessions.map((session) => {
                    const client = users.find((candidate) => candidate.id === session.client_id);
                    return (
                      <tr key={session.id}>
                        <td>
                          <strong>{client?.full_name || session.client_id}</strong>
                          <br />
                          <span style={{ fontSize: "11px", color: "#888" }}>{client?.email || "No email"}</span>
                        </td>
                        <td><span className="badge badge-info">{session.status}</span></td>
                        <td>{session.current_question_index + 1} / {session.question_total}</td>
                        <td>{session.last_feedback || "No answer yet."}</td>
                        <td>{new Date(session.updated_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {interviewPrepSessions.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No interview preparation data available yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Question</th>
                    <th>AI Answer</th>
                    <th>Clarity</th>
                    <th>Impact</th>
                    <th>Structure</th>
                  </tr>
                </thead>
                <tbody>
                  {interviewPrepResponses.map((item) => {
                    const client = users.find((candidate) => candidate.id === item.client_id);
                    return (
                      <tr key={item.id}>
                        <td>{client?.full_name || item.client_id}</td>
                        <td>{item.question_text}</td>
                        <td style={{ maxWidth: "420px" }}>{item.ai_answer}</td>
                        <td><strong>{item.clarity_score}</strong></td>
                        <td><strong>{item.impact_score}</strong></td>
                        <td><strong>{item.structure_score}</strong></td>
                      </tr>
                    );
                  })}
                  {interviewPrepResponses.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No AI-generated interview answers yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Real-time Message Chat Center */}
        {activeTab === "messages" && (
          <div className="chat-container">
            <div className="chat-sidebar">
              <div className="chat-sidebar-header">
                <h3>Conversations</h3>
              </div>
              <ul className="chat-user-list">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className={`chat-user-item ${activeChatUser?.id === u.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveChatUser(u);
                      fetchChatMessages(u.id);
                    }}
                  >
                    <img src={u.avatar_url || "https://randomuser.me/api/portraits/men/32.jpg"} alt="" className="chat-user-item-avatar" />
                    <div className="chat-user-item-details" style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="chat-user-item-name" style={{ fontWeight: u.unreadCount > 0 ? "700" : "500" }}>{u.full_name}</div>
                        {u.unreadCount > 0 && (
                          <span style={{
                            backgroundColor: "#A3E635",
                            color: "#000",
                            borderRadius: "50%",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginLeft: "6px"
                          }}>
                            {u.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="chat-user-item-preview" style={{ fontWeight: u.unreadCount > 0 ? "600" : "400", color: u.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {u.lastMessage}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="chat-area">
              {activeChatUser ? (
                <>
                  <div className="chat-header">
                    <img src={activeChatUser.avatar_url || "https://randomuser.me/api/portraits/men/32.jpg"} alt="" className="chat-user-item-avatar" />
                    <div>
                      <h4 style={{ fontWeight: "700" }}>{activeChatUser.full_name}</h4>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{activeChatUser.email}</span>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {messages.map((m) => (
                      <div key={m.id} className={`chat-bubble ${m.sender_role === "admin" || m.sender_id === "admin" ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                        {renderChatMessageContent(m)}
                        <span className="chat-bubble-time" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {(m.sender_role === "admin" || m.sender_id === "admin") && (
                            <span style={{ color: m.status === "seen" ? "#A3E635" : "rgba(255, 255, 255, 0.4)", fontWeight: "bold", fontSize: "12px" }}>
                              {m.status === "seen" ? "✓✓" : m.status === "delivered" ? "✓✓" : "✓"}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendChatMessage} className="chat-input-area">
                    <textarea
                      className="form-input"
                      placeholder="Type a support reply to user..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage(e as any);
                        }
                      }}
                      style={{ resize: "none", height: "42px", padding: "10px 12px", borderRadius: "6px" }}
                    />
                    <button type="submit" className="btn btn-primary"><Send size={16} /></button>
                  </form>
                </>
              ) : (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                  Select a candidate conversation to start support chat.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Services management tab */}
        {activeTab === "services" && (
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Service ID</th><th>Service Title</th><th>Description</th><th>Service Status</th><th>Show/Hide Visibility</th></tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td><code>{s.id}</code></td>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.description}</td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={s.status === "active"}
                            onChange={(e) => handleToggleService(s.id, { status: e.target.checked ? "active" : "inactive" })}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={s.visibility}
                            onChange={(e) => handleToggleService(s.id, { visibility: e.target.checked })}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resume AI Score Tab */}
        {activeTab === "resume_ai" && (
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Candidate</th><th>Email</th><th>Resume Score</th><th>Action Suggestions</th><th>Internal Notes</th><th>Last Evaluated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {resumeScores.map((r) => (
                    <tr key={r.user_id}>
                      <td><strong>{r.profiles?.full_name}</strong></td>
                      <td>{r.profiles?.email}</td>
                      <td><span className="badge badge-success" style={{ fontSize: "13px", fontWeight: "700" }}>{r.score}/100</span></td>
                      <td>{r.suggestions?.join(", ") || "—"}</td>
                      <td>{r.notes || "—"}</td>
                      <td>{new Date(r.updated_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("resume", r)} title="Edit AI score"><Edit size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {resumeScores.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No candidate resume scores analyzed yet. Check users and update scores.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Plan ID</th><th>Plan Name</th><th>Pricing</th><th>Features List</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.id}</code></td>
                      <td><strong>{p.name}</strong></td>
                      <td><span className="badge badge-success">{p.price}</span></td>
                      <td>{p.features?.join(" | ") || "No features added"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("plan", p)}><Edit size={14} /></button>
                          <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("pricing_plans", p.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div style={{ display: "grid", gap: "30px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "30px" }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Feature Flags</h3></div>
                <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600" }}>System Maintenance Mode</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Puts the mobile app in offline read-only mode.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appSettings.maintenanceMode}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setAppSettings((prev) => ({ ...prev, maintenanceMode: val }));
                        try {
                          const { error } = await supabase
                            .from("system_settings")
                            .update({ maintenance_mode: val })
                            .eq("id", 1);
                          if (error) throw error;
                        } catch (err: any) {
                          showError(err.message);
                        }
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600" }}>Push Notifications Queue</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Process push notification events instantly.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appSettings.pushNotificationsEnabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setAppSettings((prev) => ({ ...prev, pushNotificationsEnabled: val }));
                        try {
                          const { error } = await supabase
                            .from("system_settings")
                            .update({ push_notifications_enabled: val })
                            .eq("id", 1);
                          if (error) throw error;
                        } catch (err: any) {
                          showError(err.message);
                        }
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600" }}>Force Light Mode Default</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Override user local preference.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appSettings.darkMode}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setAppSettings((prev) => ({ ...prev, darkMode: val }));
                        try {
                          const { error } = await supabase
                            .from("system_settings")
                            .update({ dark_mode_override: val })
                            .eq("id", 1);
                          if (error) throw error;
                        } catch (err: any) {
                          showError(err.message);
                        }
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Add / Remove Administrators</h3></div>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>Only emails registered in this list can authenticate into this admin panel dashboard.</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formElem = e.currentTarget as HTMLFormElement;
                  const emailVal = (formElem.elements.namedItem("adminEmail") as HTMLInputElement).value;
                  try {
                    const { error } = await supabase.from("admins").insert([{ email: emailVal }]);
                    if (error) throw error;
                    showSuccess("Administrator added successfully!");
                    formElem.reset();
                  } catch (err: any) {
                    showError(err.message);
                  }
                }}>
                  <div className="form-group">
                    <label className="form-label">New Admin Email</label>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <input type="email" name="adminEmail" className="form-input" placeholder="name@9jobs.app" required />
                      <button type="submit" className="btn btn-primary">Add Admin</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {settingsSubsection === "personal_information" && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Personal Information</h3></div>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>Client personal information synced from the app and editable from the admin panel.</p>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Photo</th><th>Name</th><th>Email</th><th>Phone</th><th>Plan</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td><img src={u.avatar_url || "https://randomuser.me/api/portraits/men/32.jpg"} alt="" className="chat-user-item-avatar" /></td>
                          <td><strong>{u.full_name || "—"}</strong></td>
                          <td>{u.email || "—"}</td>
                          <td>{u.phone_number || "—"}</td>
                          <td><span className="badge badge-success">{u.subscription_plan || "free"}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("user", u)} title="Edit personal information"><Edit size={14} /></button>
                              <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("profiles", u.id)} title="Delete personal information"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No personal information found yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {settingsSubsection === "notifications" && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className="card-title">Notifications</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px" }}>Create, edit, update, and delete app notifications without changing the client UI.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openAddModal("notification")}><Plus size={16} /> Add Notification</button>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>ID</th><th>Title</th><th>Message</th><th>Client</th><th>Status</th><th>Timestamp</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.id}>
                        <td>{n.id}</td>
                        <td><strong>{n.title}</strong></td>
                        <td>{n.body}</td>
                        <td>{n.profiles?.full_name || n.user_id || "Unknown client"}</td>
                        <td><span className={`badge ${n.status === "read" ? "badge-success" : "badge-warning"}`}>{n.status}</span></td>
                        <td>{n.sent_at ? new Date(n.sent_at).toLocaleString() : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => openEditModal("notification", n)} title="Edit notification"><Edit size={14} /></button>
                            <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => handleDelete("notifications", String(n.id))} title="Delete notification"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {notifications.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>No notifications created yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}
      </main>

      {/* CRUD Overlay Modals */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 className="modal-title">{modalHeading}</h3>

            {/* Candidate User Form */}
            {modalType === "user" && (
              <form onSubmit={handleSaveUser}>
                {!editItem && (
                  <div className="form-group">
                    <label className="form-label">Optional Clerk User ID</label>
                    <input type="text" className="form-input" placeholder="user_2d..." value={userForm.id} onChange={(e) => setUserForm({ ...userForm, id: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" required value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-input" value={userForm.phone_number} onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" value={userForm.location} onChange={(e) => setUserForm({ ...userForm, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input type="text" className="form-input" value={userForm.headline} onChange={(e) => setUserForm({ ...userForm, headline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn URL (Optional)</label>
                  <input type="url" className="form-input" value={userForm.linkedin_url} onChange={(e) => setUserForm({ ...userForm, linkedin_url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Facebook URL (Optional)</label>
                  <input type="url" className="form-input" value={userForm.facebook_url} onChange={(e) => setUserForm({ ...userForm, facebook_url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram URL (Optional)</label>
                  <input type="url" className="form-input" value={userForm.instagram_url} onChange={(e) => setUserForm({ ...userForm, instagram_url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Twitter URL (Optional)</label>
                  <input type="url" className="form-input" value={userForm.twitter_url} onChange={(e) => setUserForm({ ...userForm, twitter_url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {userForm.avatar_url ? (
                      <img src={userForm.avatar_url} alt="" className="chat-user-item-avatar" />
                    ) : (
                      <div className="chat-user-item-avatar" style={{ display: "grid", placeItems: "center", background: "#F3F4F6", color: "#666" }}>+</div>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={() => personalInfoPhotoInputRef.current?.click()}>
                      Choose Your Device
                    </button>
                    <input ref={personalInfoPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handlePersonalInfoPhotoChange(e)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subscription tier</label>
                  <select className="form-input" value={userForm.subscription_plan} onChange={(e) => setUserForm({ ...userForm, subscription_plan: e.target.value })}>
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="elite">elite</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Candidate Profile</button>
              </form>
            )}

            {/* Candidate Opportunity Form */}
            {modalType === "job" && (
              <form onSubmit={handleSaveJob}>
                <div className="form-group">
                  <label className="form-label">Save For Candidate (Optional)</label>
                  <select className="form-input" value={jobForm.user_id} onChange={(e) => setJobForm({ ...jobForm, user_id: e.target.value })}>
                    <option value="">General opportunity only</option>
                    {users.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name} ({candidate.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input type="text" className="form-input" required placeholder="e.g. Senior Frontend Engineer" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input type="text" className="form-input" required placeholder="e.g. Atlassian" value={jobForm.company} onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select className="form-input" required value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}>
                      <option value="">Select Australia location</option>
                      {getAustraliaLocationOptions(jobForm.location).map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Salary Range</label>
                    <input type="text" className="form-input" placeholder="e.g. AUD 90k - AUD 120k" value={jobForm.salary} onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Opportunity Type</label>
                    <select className="form-input" value={jobForm.job_type} onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Remote">Remote</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Link</label>
                    <input type="url" className="form-input" placeholder="https://..." value={jobForm.job_link} onChange={(e) => setJobForm({ ...jobForm, job_link: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input type="text" className="form-input" placeholder="React, Node, TypeScript" value={jobForm.tags} onChange={(e) => setJobForm({ ...jobForm, tags: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Opportunity Notes</label>
                  <textarea rows={5} className="form-input" placeholder="Enter role details so the 9Jobs team can apply on behalf of candidates..." value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>{jobForm.user_id ? "Save And Sync To App" : "Save Opportunity"}</button>
              </form>
            )}

            {/* Pricing Plan Form */}
            {modalType === "plan" && (
              <form onSubmit={handleSavePlan}>
                {!editItem && (
                  <div className="form-group">
                    <label className="form-label">Unique Plan ID (lowercase)</label>
                    <input type="text" className="form-input" required placeholder="pro, elite, etc." value={planForm.id} onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Plan Name</label>
                  <input type="text" className="form-input" required placeholder="Pro Candidate" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pricing Label</label>
                  <input type="text" className="form-input" required placeholder="₹999/month" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Features (comma separated)</label>
                  <input type="text" className="form-input" required placeholder="Resume score, Unlimited matches" value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Subscription Plan</button>
              </form>
            )}

            {/* Resume AI Evaluation Form */}
            {modalType === "resume" && (
              <form onSubmit={handleSaveResumeScore}>
                <div className="form-group">
                  <label className="form-label">Target Candidate User ID</label>
                  <input type="text" className="form-input" disabled value={resumeForm.user_id} />
                </div>
                <div className="form-group">
                  <label className="form-label">ATS Score Match (0 - 100)</label>
                  <input type="number" className="form-input" min={0} max={100} required value={resumeForm.score} onChange={(e) => setResumeForm({ ...resumeForm, score: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Action Items/Suggestions (comma separated)</label>
                  <input type="text" className="form-input" placeholder="Add GitHub links, Flesh out experience details" value={resumeForm.suggestions} onChange={(e) => setResumeForm({ ...resumeForm, suggestions: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Internal Administrator Notes</label>
                  <textarea rows={3} className="form-input" placeholder="Resume evaluated. Candidate has solid React foundation but needs more backend details." value={resumeForm.notes} onChange={(e) => setResumeForm({ ...resumeForm, notes: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save AI Evaluation</button>
              </form>
            )}

            {modalType === "tracker" && (
              <form onSubmit={handleSaveTracker}>
                <div className="form-group">
                  <label className="form-label">Candidate</label>
                  <select
                    className="form-input"
                    required
                    value={trackerForm.user_id}
                    onChange={(e) => setTrackerForm({ ...trackerForm, user_id: e.target.value })}
                  >
                    <option value="">Select candidate</option>
                    {users.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name} ({candidate.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Opportunity</label>
                  <select
                    className="form-input"
                    required
                    value={trackerForm.job_id}
                    onChange={(e) => setTrackerForm({ ...trackerForm, job_id: e.target.value })}
                  >
                    <option value="">Select opportunity</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} - {job.company}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tracker Status</label>
                  <select
                    className="form-input"
                    value={trackerForm.status}
                    onChange={(e) => setTrackerForm({ ...trackerForm, status: e.target.value })}
                  >
                    {applicationStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>
                  Save Tracker Entry
                </button>
              </form>
            )}

            {modalType === "interview" && (
              <form onSubmit={handleSaveInterview}>
                <div className="form-group">
                  <label className="form-label">Application</label>
                  <select className="form-input" required value={interviewForm.application_id} onChange={(e) => setInterviewForm({ ...interviewForm, application_id: e.target.value })}>
                    <option value="">Select application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {(application.job_title || application.jobs?.title || "Application")} - {(application.company_name || application.jobs?.company || "Company")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Interview Type</label>
                    <select className="form-input" value={interviewForm.interview_type} onChange={(e) => setInterviewForm({ ...interviewForm, interview_type: e.target.value })}>
                      <option value="phone">phone</option>
                      <option value="video">video</option>
                      <option value="face_to_face">face_to_face</option>
                      <option value="assessment">assessment</option>
                      <option value="technical">technical</option>
                      <option value="hr">hr</option>
                      <option value="final">final</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={interviewForm.status} onChange={(e) => setInterviewForm({ ...interviewForm, status: e.target.value })}>
                      <option value="scheduled">scheduled</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="rescheduled">rescheduled</option>
                      <option value="no_show">no_show</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Round</label>
                    <input type="text" className="form-input" value={interviewForm.interview_round} onChange={(e) => setInterviewForm({ ...interviewForm, interview_round: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interview Date</label>
                    <input type="datetime-local" className="form-input" required value={interviewForm.interview_date} onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Interview</button>
              </form>
            )}

            {modalType === "follow_up" && (
              <form onSubmit={handleSaveFollowUp}>
                <div className="form-group">
                  <label className="form-label">Application</label>
                  <select className="form-input" required value={followUpForm.application_id} onChange={(e) => setFollowUpForm({ ...followUpForm, application_id: e.target.value })}>
                    <option value="">Select application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {(application.job_title || application.jobs?.title || "Application")} - {(application.company_name || application.jobs?.company || "Company")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Follow-up Type</label>
                    <input type="text" className="form-input" value={followUpForm.follow_up_type} onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_type: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="datetime-local" className="form-input" required value={followUpForm.due_date} onChange={(e) => setFollowUpForm({ ...followUpForm, due_date: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Follow-up</button>
              </form>
            )}

            {modalType === "contact" && (
              <form onSubmit={handleSaveContact}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" required value={contactForm.recruiter_name} onChange={(e) => setContactForm({ ...contactForm, recruiter_name: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input type="text" className="form-input" value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (Optional)</label>
                    <input type="email" className="form-input" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Profile Link (Optional)</label>
                  <input type="url" className="form-input" placeholder="https://linkedin.com/in/..." value={contactForm.linkedin_url} onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Hiring Manager</button>
              </form>
            )}

            {modalType === "cold_email" && (
              <form onSubmit={handleSaveColdEmail}>
                <div className="form-group">
                  <label className="form-label">Recipient Email</label>
                  <input type="email" className="form-input" required value={coldEmailForm.recipient_email} onChange={(e) => setColdEmailForm({ ...coldEmailForm, recipient_email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input type="text" className="form-input" required value={coldEmailForm.subject} onChange={(e) => setColdEmailForm({ ...coldEmailForm, subject: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea rows={4} className="form-input" required value={coldEmailForm.message} onChange={(e) => setColdEmailForm({ ...coldEmailForm, message: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Cold Email</button>
              </form>
            )}

            {modalType === "score" && (
              <form onSubmit={handleSaveScore}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ATS Score</label>
                    <input type="number" min={0} max={100} className="form-input" required value={scoreForm.ats_score} onChange={(e) => setScoreForm({ ...scoreForm, ats_score: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">AI Match Score</label>
                    <input type="number" min={0} max={100} className="form-input" required value={scoreForm.ai_match_score} onChange={(e) => setScoreForm({ ...scoreForm, ai_match_score: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea rows={3} className="form-input" value={scoreForm.score_reason} onChange={(e) => setScoreForm({ ...scoreForm, score_reason: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Scores</button>
              </form>
            )}

            {modalType === "quick_update" && (
              <form onSubmit={handleQuickUpdate}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={quickUpdateForm.status} onChange={(e) => setQuickUpdateForm({ ...quickUpdateForm, status: e.target.value, current_stage: e.target.value })}>
                    {applicationStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Next Action</label>
                  <input type="text" className="form-input" value={quickUpdateForm.next_action} onChange={(e) => setQuickUpdateForm({ ...quickUpdateForm, next_action: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input type="datetime-local" className="form-input" value={quickUpdateForm.next_action_date} onChange={(e) => setQuickUpdateForm({ ...quickUpdateForm, next_action_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea rows={4} className="form-input" value={quickUpdateForm.notes} onChange={(e) => setQuickUpdateForm({ ...quickUpdateForm, notes: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Quick Update</button>
              </form>
            )}

            {modalType === "success_story" && (
              <form onSubmit={handleSaveSuccessStory}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Client Name</label>
                    <input type="text" className="form-input" required value={successStoryForm.name} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input type="text" className="form-input" required value={successStoryForm.position} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, position: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Year / Time Label</label>
                    <input type="text" className="form-input" required placeholder="e.g. 4 months" value={successStoryForm.year} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, year: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Story Rate (1 - 5)</label>
                    <input type="number" min={1} max={5} className="form-input" required value={successStoryForm.story_rate} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, story_rate: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input type="number" min={0} className="form-input" value={successStoryForm.display_order} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, display_order: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={successStoryForm.is_active ? "active" : "hidden"} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, is_active: e.target.value === "active" })}>
                      <option value="active">active</option>
                      <option value="hidden">hidden</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Photo</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {successStoryForm.photo_url ? (
                      <img src={successStoryForm.photo_url} alt="" className="chat-user-item-avatar" />
                    ) : (
                      <div className="chat-user-item-avatar" style={{ display: "grid", placeItems: "center", background: "#F3F4F6", color: "#666" }}>+</div>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={() => successStoryPhotoInputRef.current?.click()} disabled={successStoryPhotoUploading}>
                      {successStoryPhotoUploading ? "Uploading..." : "Upload From Device"}
                    </button>
                    <input ref={successStoryPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleSuccessStoryPhotoChange(e)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea rows={4} className="form-input" required value={successStoryForm.message} onChange={(e) => setSuccessStoryForm({ ...successStoryForm, message: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }} disabled={successStoryPhotoUploading}>
                  Save Success Story
                </button>
              </form>
            )}

            {/* Send push notification form */}
            {modalType === "notification" && (
              <form onSubmit={handleSendNotification}>
                <div className="form-group">
                  <label className="form-label">Push Notification Title</label>
                  <input type="text" className="form-input" required placeholder="New Hot Job Recommended!" value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Message Body</label>
                  <textarea rows={4} className="form-input" required placeholder="We found a Senior React developer job that matches your profile by 97%. Apply now!" value={notificationForm.body} onChange={(e) => setNotificationForm({ ...notificationForm, body: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Broadcast Target Candidate ID (Leave empty to send to all users)</label>
                  <input type="text" className="form-input" placeholder="user_2d... or empty" value={notificationForm.user_id} onChange={(e) => setNotificationForm({ ...notificationForm, user_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={notificationForm.status} onChange={(e) => setNotificationForm({ ...notificationForm, status: e.target.value })}>
                    <option value="sent">sent</option>
                    <option value="read">read</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>{editItem ? "Update Notification" : "Send Notification"}</button>
              </form>
            )}

            {errorMsg && <div style={{ color: "#FF4D4D", marginTop: "16px", fontSize: "14px" }}>{errorMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
