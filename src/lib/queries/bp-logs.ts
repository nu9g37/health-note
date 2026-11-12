import { createClient } from "@/lib/supabase/server";
import type { BpLog } from "@/types";

export async function getBpLogs(limit = 50): Promise<BpLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blood_pressure_logs")
    .select("*")
    .order("measured_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as BpLog[];
}
