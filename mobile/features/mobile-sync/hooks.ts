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
  enableRealtime = true,
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
    refetchOnMount: true,
    refetchOnReconnect: true,
    ...options,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
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
