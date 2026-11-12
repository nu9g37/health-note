"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bpFormSchema } from "@/lib/validations/bp";

export type BpFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function createBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "You must be signed in" };

  const measuredAtRaw = formData.get("measuredAt");
  const parsed = bpFormSchema.safeParse({
    systolic: formData.get("systolic"),
    diastolic: formData.get("diastolic"),
    pulse: formData.get("pulse"),
    measuredAt: measuredAtRaw ? String(measuredAtRaw) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { systolic, diastolic, pulse, measuredAt } = parsed.data;

  if (measuredAt && Number.isNaN(new Date(measuredAt).getTime())) {
    return { error: "Invalid date" };
  }

  const { error } = await supabase.from("blood_pressure_logs").insert({
    user_id: userId,
    systolic,
    diastolic,
    pulse: pulse ?? null,
    ...(measuredAt ? { measured_at: new Date(measuredAt).toISOString() } : {}),
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBpLog(formData: FormData) {
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;

  await supabase
    .from("blood_pressure_logs")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", userId);

  revalidatePath("/dashboard");
}
