"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type SubmitEvent,
  type SyntheticEvent,
} from "react";
import { createBpLog, updateBpLog, type BpFormState } from "@/actions/bp-logs";
import { BpImage } from "@/components/bp/bp-image";
import { compressBpImage } from "@/lib/bp/compress-image";
import { BP_IMAGE_ACCEPT, formatBytes } from "@/lib/bp/image";
import type { BpLogWithImageUrl } from "@/types";

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateTimeLocal(date);
}

type ParsedMeasuredAt =
  | { ok: true; iso: string }
  | { ok: false; error: string };

function parseMeasuredAtLocal(value: string): ParsedMeasuredAt {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Please enter a valid date and time" };
  }
  if (date.getTime() > Date.now()) {
    return { ok: false, error: "Measured time cannot be in the future" };
  }
  return { ok: true, iso: date.toISOString() };
}

const currentMinuteListeners = new Set<() => void>();

function notifyCurrentMinuteListeners() {
  for (const listener of currentMinuteListeners) {
    listener();
  }
}

function subscribeToCurrentMinute(onStoreChange: () => void) {
  currentMinuteListeners.add(onStoreChange);

  let timeoutId: ReturnType<typeof setTimeout>;
  const scheduleNextTick = () => {
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
    timeoutId = setTimeout(() => {
      onStoreChange();
      scheduleNextTick();
    }, msUntilNextMinute);
  };

  scheduleNextTick();
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);

  return () => {
    currentMinuteListeners.delete(onStoreChange);
    clearTimeout(timeoutId);
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

function getCurrentMinuteSnapshot() {
  return formatDateTimeLocal(new Date());
}

function getServerMinuteSnapshot(): string | undefined {
  return undefined;
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
  const measuredAtInputRef = useRef<HTMLInputElement>(null);
  const compressionRequestRef = useRef(0);
  const measuredAtErrorId = useId();
  const maxMeasuredAt = useSyncExternalStore(
    subscribeToCurrentMinute,
    getCurrentMinuteSnapshot,
    getServerMinuteSnapshot,
  );

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [measuredAtError, setMeasuredAtError] = useState<string | null>(null);

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
        setMeasuredAtError(null);
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

  function handleMeasuredAtRefresh(event: SyntheticEvent<HTMLInputElement>) {
    event.currentTarget.max = getCurrentMinuteSnapshot();
    notifyCurrentMinuteListeners();
  }

  function handleMeasuredAtChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    if (!value) {
      setMeasuredAtError(null);
      return;
    }

    const parsed = parseMeasuredAtLocal(value);
    setMeasuredAtError(parsed.ok ? null : parsed.error);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (compressing) return;
    setImageError(null);
    setMeasuredAtError(null);

    const formData = new FormData(event.currentTarget);
    const local = formData.get("measuredAt");
    if (typeof local === "string" && local) {
      const parsed = parseMeasuredAtLocal(local);
      if (!parsed.ok) {
        setMeasuredAtError(parsed.error);
        measuredAtInputRef.current?.focus();
        return;
      }
      formData.set("measuredAt", parsed.iso);
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
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
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
            className="rounded-lg border border-border bg-background px-3 py-3 text-lg text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            className="rounded-lg border border-border bg-background px-3 py-3 text-lg text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            className="rounded-lg border border-border bg-background px-3 py-3 text-lg text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1 text-sm">
          {isEditing
            ? "Measured at"
            : "Measured at (optional, defaults to now)"}
          <input
            ref={measuredAtInputRef}
            name="measuredAt"
            type="datetime-local"
            max={maxMeasuredAt}
            required={isEditing}
            defaultValue={
              initialLog
                ? toDateTimeLocalValue(initialLog.measured_at)
                : undefined
            }
            onPointerDown={handleMeasuredAtRefresh}
            onFocus={handleMeasuredAtRefresh}
            onChange={handleMeasuredAtChange}
            aria-invalid={Boolean(measuredAtError) || undefined}
            aria-describedby={measuredAtError ? measuredAtErrorId : undefined}
            className="rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        {measuredAtError && (
          <p
            id={measuredAtErrorId}
            role="alert"
            className="text-xs text-accent-text"
          >
            {measuredAtError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Image (optional)
          <input
            ref={fileInputRef}
            type="file"
            accept={BP_IMAGE_ACCEPT}
            onChange={handleImageChange}
            disabled={pending || compressing}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-surface-subtle file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground"
          />
        </label>

        {compressing && (
          <p className="text-xs text-muted">Compressing image...</p>
        )}

        {imageError && (
          <p role="alert" className="text-xs text-accent-text">
            {imageError}
          </p>
        )}

        {(selectedImage || hasExistingImage) && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2">
            <div className="flex min-w-0 items-center gap-3">
              {activePreviewUrl ? (
                <BpImage
                  src={activePreviewUrl}
                  alt="Blood pressure monitor preview"
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded border border-border object-cover"
                  fallback={
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface-subtle px-1 text-center text-[11px] text-muted">
                      No preview
                    </span>
                  }
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface-subtle px-1 text-center text-[11px] text-muted">
                  Attached
                </span>
              )}

              <div className="min-w-0 text-xs text-foreground">
                {selectedImage ? (
                  <>
                    <p className="truncate font-medium">
                      {selectedImage.file.name}
                    </p>
                    <p className="text-muted">
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
              className="shrink-0 cursor-pointer rounded border border-accent/40 px-2 py-1 text-xs font-medium text-accent-text transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}

        {!selectedImage && removeExistingImage && initialLog?.image && (
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-2 text-xs text-muted">
            <span>Image will be removed when saved</span>
            <button
              type="button"
              onClick={handleRestoreExistingImage}
              disabled={pending}
              className="cursor-pointer text-primary-text underline hover:opacity-80 disabled:opacity-50"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-accent-text">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || compressing}
          className="flex-1 cursor-pointer rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : isEditing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}
