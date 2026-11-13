import { getAuthSession } from "@/lib/auth/server";
import type { BpLog } from "@/types";

export async function getBpLogs(limit = 50): Promise<BpLog[]> {
  const session = await getAuthSession();
  if (session.kind !== "authenticated") return [];

  const { data, error } = await session.supabase
    .from("blood_pressure_logs")
    .select("*")
    .order("measured_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as BpLog[];
}
