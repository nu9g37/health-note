import { getAuthSession } from "@/lib/auth/server";
import { createSignedImageUrlMap } from "@/lib/bp/storage";
import type { BpLog, BpLogWithImageUrl } from "@/types";

export async function getBpLogs(limit = 50): Promise<BpLogWithImageUrl[]> {
  const session = await getAuthSession();
  if (session.kind !== "authenticated") return [];

  const { data, error } = await session.supabase
    .from("blood_pressure_logs")
    .select("*")
    .order("measured_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const logs = (data ?? []) as BpLog[];
  const imagePaths = logs
    .map((log) => log.image)
    .filter((path): path is string => Boolean(path));
  const signedUrls = await createSignedImageUrlMap(
    session.supabase,
    imagePaths,
  );

  return logs.map((log) => ({
    ...log,
    imageUrl: log.image ? (signedUrls.get(log.image) ?? null) : null,
  }));
}
