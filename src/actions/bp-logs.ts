"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionKind } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bpFormSchema } from "@/lib/validations/bp";

export type BpFormState =
  | { error?: string; success?: boolean }
  | undefined;

type ParsedBpPayload =
  | {
      data: {
        systolic: number;
        diastolic: number;
        pulse: number | null;
        measured_at?: string;
      };
    }
  | { error: string };

async function getAuthContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (getSessionKind(data?.claims) !== "authenticated") return null;
  const userId = data?.claims?.sub;
  if (!userId) return null;
  return { supabase, userId };
}

function parseBpFormData(formData: FormData): ParsedBpPayload {
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

  return {
    data: {
      systolic,
      diastolic,
      pulse: pulse ?? null,
      ...(measuredAt ? { measured_at: new Date(measuredAt).toISOString() } : {}),
    },
  };
}

export async function createBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if (!auth) return { error: "You must be signed in" };

  const parsed = parseBpFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await auth.supabase.from("blood_pressure_logs").insert({
    user_id: auth.userId,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if (!auth) return { error: "You must be signed in" };

  const idResult = z.uuid().safeParse(formData.get("id"));
  if (!idResult.success) return { error: "Invalid record ID" };

  const parsed = parseBpFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data, error } = await auth.supabase
    .from("blood_pressure_logs")
    .update(parsed.data)
    .eq("id", idResult.data)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Record not found" };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if (!auth) return { error: "You must be signed in" };

  const idResult = z.uuid().safeParse(formData.get("id"));
  if (!idResult.success) return { error: "Invalid record ID" };

  const { data, error } = await auth.supabase
    .from("blood_pressure_logs")
    .delete()
    .eq("id", idResult.data)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Record not found" };

  revalidatePath("/dashboard");
  return { success: true };
}
