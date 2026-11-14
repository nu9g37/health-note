"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyActionSession } from "@/lib/auth/server";
import { removeBpImageSafely, uploadBpImage } from "@/lib/bp/storage";
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
        imageFile?: File;
        removeImage: boolean;
      };
    }
  | { error: string };

async function getAuthContext() {
  const session = await verifyActionSession("authenticated");
  if (!session.ok) {
    return {
      error:
        session.reason === "unavailable"
          ? "Unable to verify your session. Please try again."
          : "You must be signed in",
    } as const;
  }
  return { supabase: session.supabase, userId: session.userId } as const;
}

function parseBpFormData(formData: FormData): ParsedBpPayload {
  const measuredAtRaw = formData.get("measuredAt");
  const parsed = bpFormSchema.safeParse({
    systolic: formData.get("systolic"),
    diastolic: formData.get("diastolic"),
    pulse: formData.get("pulse"),
    measuredAt: measuredAtRaw ? String(measuredAtRaw) : undefined,
    image: formData.get("image"),
    removeImage: formData.get("removeImage"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { systolic, diastolic, pulse, measuredAt, image, removeImage } =
    parsed.data;

  if (measuredAt && Number.isNaN(new Date(measuredAt).getTime())) {
    return { error: "Invalid date" };
  }

  return {
    data: {
      systolic,
      diastolic,
      pulse: pulse ?? null,
      ...(measuredAt ? { measured_at: new Date(measuredAt).toISOString() } : {}),
      imageFile: image,
      removeImage: Boolean(removeImage),
    },
  };
}

export async function createBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if ("error" in auth) return { error: auth.error };

  const parsed = parseBpFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { imageFile, removeImage: _removeImage, ...dbFields } = parsed.data;
  void _removeImage;

  let uploadedPath: string | null = null;
  if (imageFile) {
    const uploadResult = await uploadBpImage(
      auth.supabase,
      auth.userId,
      imageFile,
    );
    if ("error" in uploadResult) return { error: uploadResult.error };
    uploadedPath = uploadResult.path;
  }

  const { error } = await auth.supabase.from("blood_pressure_logs").insert({
    user_id: auth.userId,
    ...dbFields,
    image: uploadedPath,
  });

  if (error) {
    if (uploadedPath) {
      await removeBpImageSafely(auth.supabase, uploadedPath);
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if ("error" in auth) return { error: auth.error };

  const idResult = z.uuid().safeParse(formData.get("id"));
  if (!idResult.success) return { error: "Invalid record ID" };

  const parsed = parseBpFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: existing, error: fetchError } = await auth.supabase
    .from("blood_pressure_logs")
    .select("id, image")
    .eq("id", idResult.data)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Record not found" };

  const existingImage = (existing as { id: string; image: string | null }).image;
  const { imageFile, removeImage, ...dbFields } = parsed.data;

  let uploadedPath: string | null = null;
  let nextImage: string | null = existingImage;

  if (imageFile) {
    const uploadResult = await uploadBpImage(
      auth.supabase,
      auth.userId,
      imageFile,
    );
    if ("error" in uploadResult) return { error: uploadResult.error };
    uploadedPath = uploadResult.path;
    nextImage = uploadResult.path;
  } else if (removeImage) {
    nextImage = null;
  }

  const { data, error } = await auth.supabase
    .from("blood_pressure_logs")
    .update({
      ...dbFields,
      image: nextImage,
    })
    .eq("id", idResult.data)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (uploadedPath) {
      await removeBpImageSafely(auth.supabase, uploadedPath);
    }
    return { error: error ? error.message : "Record not found" };
  }

  if (existingImage && existingImage !== nextImage) {
    await removeBpImageSafely(auth.supabase, existingImage);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBpLog(
  _prev: BpFormState,
  formData: FormData,
): Promise<BpFormState> {
  const auth = await getAuthContext();
  if ("error" in auth) return { error: auth.error };

  const idResult = z.uuid().safeParse(formData.get("id"));
  if (!idResult.success) return { error: "Invalid record ID" };

  const { data, error } = await auth.supabase
    .from("blood_pressure_logs")
    .delete()
    .eq("id", idResult.data)
    .eq("user_id", auth.userId)
    .select("id, image")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Record not found" };

  const deletedImage = (data as { id: string; image: string | null }).image;
  if (deletedImage) {
    await removeBpImageSafely(auth.supabase, deletedImage);
  }

  revalidatePath("/dashboard");
  return { success: true };
}
