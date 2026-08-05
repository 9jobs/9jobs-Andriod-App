import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import {
  fetchMobileSyncSnapshot,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendMessageToAdmin,
  sendRichMessageToAdmin,
} from "@/lib/data/mobile-sync-repository";
import { queryKeys } from "@/lib/queries";
import { useRealtimeInvalidation } from "@/lib/supabase/useRealtimeInvalidation";
import type { MobileSyncSnapshot } from "@/lib/data/mobile-sync-repository";
import { useSession } from "@/providers/SessionProvider";
import { fetchCandidateQuestionnaire } from "@/lib/data/candidate-questionnaire";

const shouldEnableLiveTransport =
  process.env.NODE_ENV === "test" ||
  (!__DEV__ || process.env.EXPO_PUBLIC_ENABLE_MOBILE_SOCKET === "true");

function usePreviewRealtimeSync(channelName: string, tables: string[]) {
  useRealtimeInvalidation(
    channelName,
    tables.map((table) => ({ table, queryKeys: [queryKeys.previewSync] })),
  );
}

const previewSyncTables = [
  "profiles",
  "jobs",
  "applications",
  "saved_jobs",
  "interviews",
  "follow_ups",
  "recruiter_contacts",
  "cold_emails",
  "client_scores",
  "activity_logs",
  "messages",
  "services",
  "success_stories",
  "pricing_plans",
  "user_subscriptions",
  "resume_scores",
  "job_categories",
  "system_settings",
  "notifications",
];

export function usePreviewSyncQuery<TData = MobileSyncSnapshot>(
  enableRealtime = false,
  options?: Omit<UseQueryOptions<MobileSyncSnapshot, Error, TData>, "queryKey" | "queryFn"> & {
    queryKey?: readonly unknown[];
  },
) {
  const { user } = useSession();

  if (enableRealtime && shouldEnableLiveTransport) {
    usePreviewRealtimeSync("preview-sync-core", previewSyncTables);
  }

  return useQuery({
    queryKey: options?.queryKey ?? [...queryKeys.previewSync, user?.id ?? "preview-user"],
    queryFn: () => fetchMobileSyncSnapshot(user),
    retry: 1,
    refetchInterval: shouldEnableLiveTransport ? false : 15000,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    ...options,
  });
}

export function useCandidateQuestionnaireQuery() {
  const { user } = useSession();
  return useQuery({
    queryKey: [queryKeys.questionnaire, user?.id ?? "preview-user"],
    queryFn: () => {
      if (!user) return Promise.resolve(null);
      return fetchCandidateQuestionnaire(user);
    },
    staleTime: 120_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

export function useSendMessageToAdminMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (
      content:
        | string
        | {
            text?: string;
            messageType?: "text" | "image" | "document";
            attachmentUrl?: string;
            attachmentName?: string;
            attachmentMimeType?: string;
            attachmentSize?: number;
          },
    ) => (typeof content === "string" ? sendMessageToAdmin(content, user) : sendRichMessageToAdmin(content, user)),
    onMutate: (content) => {
      const previousSnapshots = queryClient.getQueriesData<MobileSyncSnapshot>({
        queryKey: queryKeys.previewSync,
      });
      const payload = typeof content === "string" ? { text: content } : content;
      const createdAt = new Date().toISOString();
      const optimisticMessage = {
        id: -Date.now(),
        conversation_id: user?.id ?? "preview-user-9jobs",
        sender_id: user?.id ?? "preview-user-9jobs",
        sender_role: "client",
        recipient_id: "admin",
        message_type: payload.messageType ?? "text",
        text: payload.text ?? "",
        content: payload.text ?? "",
        attachment_url: payload.attachmentUrl ?? null,
        attachment_name: payload.attachmentName ?? null,
        attachment_mime_type: payload.attachmentMimeType ?? null,
        attachment_size: payload.attachmentSize ?? null,
        status: "sending",
        created_at: createdAt,
        direction: "outgoing" as const,
      };

      queryClient.setQueriesData<MobileSyncSnapshot>(
        { queryKey: queryKeys.previewSync },
        (current) => current
          ? { ...current, messages: [...current.messages, optimisticMessage] }
          : current,
      );
      void queryClient.cancelQueries({ queryKey: queryKeys.previewSync });

      return { previousSnapshots };
    },
    onError: (_error, _content, context) => {
      context?.previousSnapshots.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData(queryKey, snapshot);
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (notificationId: number) => markNotificationAsRead(notificationId, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}
