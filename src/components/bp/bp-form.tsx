"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { createBpLog, updateBpLog, type BpFormState } from "@/actions/bp-logs";
import { BpImage } from "@/components/bp/bp-image";
import { compressBpImage } from "@/lib/bp/compress-image";
import { BP_IMAGE_ACCEPT, formatBytes } from "@/lib/bp/image";
import type { BpLogWithImageUrl } from "@/types";

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface SelectedImage {
  file: File;
  previewUrl: string;
  compressed: boolean;
}

interface BpFormProps {
  initialLog?: BpLogWithImageUrl;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BpForm({ initialLog, onSuccess, onCancel }: BpFormProps) {
  const isEditing = Boolean(initialLog);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compressionRequestRef = useRef(0);

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (prev: BpFormState, formData: FormData) => {
      const result = await (isEditing ? updateBpLog : createBpLog)(
        prev,
        formData,
      );
      if (result?.success && !isEditing) {
        compressionRequestRef.current += 1;
        formRef.current?.reset();
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedImage(null);
        setRemoveExistingImage(false);
        setImageError(null);
      }
      return result;
    },
    undefined,
  );

  useEffect(() => {
    return () => {
      compressionRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const url = selectedImage?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selectedImage?.previewUrl]);

  useEffect(() => {
    if (state?.success && isEditing) {
      onSuccess?.();
    }
  }, [state, isEditing, onSuccess]);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const requestId = ++compressionRequestRef.current;
    setCompressing(true);
    setImageError(null);

    try {
      const result = await compressBpImage(file);
      if (requestId !== compressionRequestRef.current) return;

      const previewUrl = URL.createObjectURL(result.file);
      setSelectedImage({
        file: result.file,
        previewUrl,
        compressed: result.compressed,
      });
      setRemoveExistingImage(false);
    } catch (error) {
      if (requestId !== compressionRequestRef.current) return;

      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedImage(null);
      setImageError(
        error instanceof Error ? error.message : "Unable to process image",
      );
    } finally {
      if (requestId === compressionRequestRef.current) {
        setCompressing(false);
      }
    }
  }

  function handleRemoveImage() {
    compressionRequestRef.current += 1;
    setCompressing(false);
    setSelectedImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (initialLog?.image) {
      setRemoveExistingImage(true);
    }
  }

  function handleRestoreExistingImage() {
    setImageError(null);
    setRemoveExistingImage(false);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (compressing) return;
    setImageError(null);

    const formData = new FormData(event.currentTarget);
    const local = formData.get("measuredAt");
    if (typeof local === "string" && local) {
      formData.set("measuredAt", new Date(local).toISOString());
    }

    if (selectedImage) {
      formData.set("image", selectedImage.file);
      formData.delete("removeImage");
    } else {
      formData.delete("image");
      if (removeExistingImage) {
        formData.set("removeImage", "true");
      } else {
        formData.delete("removeImage");
      }
    }

    startTransition(() => {
      action(formData);
    });
  }

  const hasExistingImage = Boolean(initialLog?.image) && !removeExistingImage;
  const activePreviewUrl =
    selectedImage?.previewUrl ??
    (hasExistingImage ? (initialLog?.imageUrl ?? null) : null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      {initialLog && <input type="hidden" name="id" value={initialLog.id} />}

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Systolic
          <input
            name="systolic"
            type="number"
            inputMode="numeric"
            required
            placeholder="120"
            defaultValue={initialLog?.systolic}
            className="rounded-lg border px-3 py-3 text-lg"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Diastolic
          <input
            name="diastolic"
            type="number"
            inputMode="numeric"
            required
            placeholder="80"
            defaultValue={initialLog?.diastolic}
            className="rounded-lg border px-3 py-3 text-lg"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pulse
          <input
            name="pulse"
            type="number"
            inputMode="numeric"
            placeholder="70"
            defaultValue={initialLog?.pulse ?? ""}
            className="rounded-lg border px-3 py-3 text-lg"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {isEditing ? "Measured at" : "Measured at (optional, defaults to now)"}
        <input
          name="measuredAt"
          type="datetime-local"
          required={isEditing}
          defaultValue={
            initialLog ? toDateTimeLocalValue(initialLog.measured_at) : undefined
          }
          className="rounded-lg border px-3 py-3 text-base"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Image (optional)
          <input
            ref={fileInputRef}
            type="file"
            accept={BP_IMAGE_ACCEPT}
            onChange={handleImageChange}
            disabled={pending || compressing}
            className="rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium dark:file:bg-gray-800"
          />
        </label>

        {compressing && (
          <p className="text-xs text-gray-500">Compressing image...</p>
        )}

        {imageError && (
          <p role="alert" className="text-xs text-red-600">
            {imageError}
          </p>
        )}

        {(selectedImage || hasExistingImage) && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-2">
            <div className="flex min-w-0 items-center gap-3">
              {activePreviewUrl ? (
                <BpImage
                  src={activePreviewUrl}
                  alt="Blood pressure monitor preview"
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded border object-cover"
                  fallback={
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded border bg-gray-100 px-1 text-center text-[11px] text-gray-500 dark:bg-gray-800">
                      No preview
                    </span>
                  }
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded border bg-gray-100 px-1 text-center text-[11px] text-gray-500 dark:bg-gray-800">
                  Attached
                </span>
              )}

              <div className="min-w-0 text-xs text-gray-600 dark:text-gray-300">
                {selectedImage ? (
                  <>
                    <p className="truncate font-medium">
                      {selectedImage.file.name}
                    </p>
                    <p className="text-gray-500">
                      {formatBytes(selectedImage.file.size)}
                      {selectedImage.compressed ? " (compressed)" : ""}
                    </p>
                  </>
                ) : (
                  <p className="font-medium">Existing image attached</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={pending}
              className="shrink-0 rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              Remove
            </button>
          </div>
        )}

        {!selectedImage && removeExistingImage && initialLog?.image && (
          <div className="flex items-center justify-between rounded-lg border border-dashed p-2 text-xs text-gray-500">
            <span>Image will be removed when saved</span>
            <button
              type="button"
              onClick={handleRestoreExistingImage}
              disabled={pending}
              className="text-blue-600 underline disabled:opacity-50"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-lg border px-4 py-3 text-base font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || compressing}
          className="flex-1 rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : isEditing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}
