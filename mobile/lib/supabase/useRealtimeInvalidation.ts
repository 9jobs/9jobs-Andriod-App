import { useEffect, useRef } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

type TableConfig = {
  table: string;
  queryKeys: QueryKey[];
};

export function useRealtimeInvalidation(channelName: string, tables: TableConfig[]) {
  const queryClient = useQueryClient();
  const tablesKey = tables.map((table) => table.table).join(",");
  const channelInstanceName = useRef(
    `${channelName}-${Math.random().toString(36).slice(2, 10)}`,
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    const channel = client.channel(channelInstanceName.current);
    for (const config of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: config.table },
        () => {
          for (const queryKey of config.queryKeys) {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      );
    }

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient, tablesKey]);
}
