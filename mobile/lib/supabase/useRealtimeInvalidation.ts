import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

type TableConfig = { table: string; queryKeys: QueryKey[] };
export function useRealtimeInvalidation(channelName: string, tables: TableConfig[]) {
  const queryClient = useQueryClient();
  const tablesKey = tables.map(table => table.table).join(",");
  useEffect(() => {
    // Chat uses Socket.IO; other Neon records refresh through the backend.
    const refresh = setInterval(() => {
      for (const config of tables) {
        for (const queryKey of config.queryKeys) void queryClient.invalidateQueries({ queryKey });
      }
    }, 15000);
    return () => clearInterval(refresh);
  }, [queryClient, tablesKey, channelName]);
}
