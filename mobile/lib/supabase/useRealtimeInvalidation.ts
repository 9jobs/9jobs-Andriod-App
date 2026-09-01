import { useEffect } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type TableConfig = {
  table: string;
  queryKeys: QueryKey[];
};

// Global subscription registry to share channels with the same name across components
const activeChannels = new Map<
  string,
  {
    channel: RealtimeChannel;
    refCount: number;
  }
>();
const pendingInvalidationTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function useRealtimeInvalidation(channelName: string, tables: TableConfig[]) {
  const queryClient = useQueryClient();
  const tablesKey = tables.map((table) => table.table).join(",");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let channelInfo = activeChannels.get(channelName);

    if (!channelInfo) {
      const channel = client.channel(channelName);
      for (const config of tables) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: config.table },
          () => {
            const timerKey = `${channelName}:${config.table}`;
            const existingTimer = pendingInvalidationTimers.get(timerKey);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            const nextTimer = setTimeout(() => {
              pendingInvalidationTimers.delete(timerKey);
              for (const queryKey of config.queryKeys) {
                void queryClient.invalidateQueries({ queryKey });
              }
            }, 120);

            pendingInvalidationTimers.set(timerKey, nextTimer);
          },
        );
      }
      channel.subscribe();
      channelInfo = { channel, refCount: 0 };
      activeChannels.set(channelName, channelInfo);
    }

    channelInfo.refCount++;

    return () => {
      const info = activeChannels.get(channelName);
      if (info) {
        info.refCount--;
        if (info.refCount <= 0) {
          void client.removeChannel(info.channel);
          activeChannels.delete(channelName);
          for (const timerKey of [...pendingInvalidationTimers.keys()]) {
            if (timerKey.startsWith(`${channelName}:`)) {
              clearTimeout(pendingInvalidationTimers.get(timerKey));
              pendingInvalidationTimers.delete(timerKey);
            }
          }
        }
      }
    };
  }, [queryClient, tablesKey, channelName]);
}
