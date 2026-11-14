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
  type DragEvent,
  type RefObject,
  type SubmitEvent,
  type SyntheticEvent,
} from "react";
import { createBpLog, updateBpLog, type BpFormState } from "@/actions/bp-logs";
import { BpImage } from "@/components/bp/bp-image";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
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
  /** Omits the outer card frame when rendered inside an existing container such as `Modal`. */
  embedded?: boolean;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const READING_INPUT_CLASS =
  "w-full min-w-0 rounded-lg border border-border bg-background py-2.5 pl-3 text-lg font-semibold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted/50 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function parseWholeNumberInRange(
  raw: string,
  min: number,
  max: number,
): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function PulseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-4 w-4 shrink-0 text-muted"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 10.5h3l2-5 3.25 9 2.25-4h4.5"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-3.5 w-3.5 shrink-0 text-muted"
    >
      <circle cx="10" cy="10" r="7" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6.5V10l2.5 1.5"
      />
    </svg>
  );
}

function PhotoIcon({
  className = "h-4 w-4 shrink-0 text-muted",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7.5" cy="8.25" r="1.25" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 14 3.5-3.5 2.5 2.5 2-2 3 3"
      />
    </svg>
  );
}

function CameraIcon({
  className = "h-4 w-4 shrink-0 text-muted",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 7.5A1.5 1.5 0 0 1 5 6h1.75l1-1.5h4.5l1 1.5H15a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 16H5a1.5 1.5 0 0 1-1.5-1.5v-7Z"
      />
      <circle cx="10" cy="10.75" r="2.5" />
    </svg>
  );
}

function shouldPromptImageSource() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(pointer: coarse), (max-width: 639px)").matches;
}

interface ImageSourceChooserProps {
  takePhotoButtonRef: RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  onSelectCamera: () => void;
  onSelectFile: () => void;
  onCancel: () => void;
}

function ImageSourceChooser({
  takePhotoButtonRef,
  disabled,
  onSelectCamera,
  onSelectFile,
  onCancel,
}: ImageSourceChooserProps) {
  return (
    <div
      role="group"
      aria-label="Choose image source"
      className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-xs font-medium text-muted">
          Choose image source
        </span>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className={`cursor-pointer text-xs font-medium text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          ref={takePhotoButtonRef}
          type="button"
          onClick={onSelectCamera}
          disabled={disabled}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
        >
          <CameraIcon className="h-4 w-4 shrink-0 text-primary-text" />
          <span>Take photo</span>
        </button>
        <button
          type="button"
          onClick={onSelectFile}
          disabled={disabled}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
        >
          <PhotoIcon className="h-4 w-4 shrink-0 text-muted" />
          <span>Choose file</span>
        </button>
      </div>
    </div>
  );
}

interface ReadingFieldProps {
  name: string;
  label: string;
  unit: string;
  placeholder: string;
  defaultValue?: number | string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  paddingRightClass: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

function ReadingField({
  name,
  label,
  unit,
  placeholder,
  defaultValue,
  required = false,
  optional = false,
  className = "",
  paddingRightClass,
  onChange,
}: ReadingFieldProps) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="flex items-center justify-between gap-1 text-xs font-medium text-muted">
        <span>{label}</span>
        {optional && (
          <span className="text-[11px] font-normal text-muted/80">
            Optional
          </span>
        )}
      </span>
      <div className="relative flex items-center">
        <input
          name={name}
          type="number"
          inputMode="numeric"
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
          className={`${READING_INPUT_CLASS} ${paddingRightClass}`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 text-[11px] font-medium text-muted"
        >
          {unit}
        </span>
      </div>
    </label>
  );
}

export function BpForm({
  initialLog,
  onSuccess,
  onCancel,
  embedded,
}: BpFormProps) {
  const isEditing = Boolean(initialLog);
  const isEmbedded = embedded ?? Boolean(onCancel);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const takePhotoButtonRef = useRef<HTMLButtonElement>(null);
  const measuredAtInputRef = useRef<HTMLInputElement>(null);
  const compressionRequestRef = useRef(0);
  const measuredAtId = useId();
  const measuredAtErrorId = useId();
  const maxMeasuredAt = useSyncExternalStore(
    subscribeToCurrentMinute,
    getCurrentMinuteSnapshot,
    getServerMinuteSnapshot,
  );

  const [systolicInput, setSystolicInput] = useState(() =>
    initialLog ? String(initialLog.systolic) : "",
  );
  const [diastolicInput, setDiastolicInput] = useState(() =>
    initialLog ? String(initialLog.diastolic) : "",
  );
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [measuredAtError, setMeasuredAtError] = useState<string | null>(null);

  function resetImageInputs() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  const [state, action, pending] = useActionState(
    async (prev: BpFormState, formData: FormData) => {
      const result = await (isEditing ? updateBpLog : createBpLog)(
        prev,
        formData,
      );
      if (result?.success && !isEditing) {
        compressionRequestRef.current += 1;
        formRef.current?.reset();
        resetImageInputs();
        setSystolicInput("");
        setDiastolicInput("");
        setSelectedImage(null);
        setRemoveExistingImage(false);
        setIsDraggingImage(false);
        setShowImageSourcePicker(false);
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

  useEffect(() => {
    if (!showImageSourcePicker) return;
    takePhotoButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setShowImageSourcePicker(false);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [showImageSourcePicker]);

  async function processImageFile(file: File) {
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

      resetImageInputs();
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

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setShowImageSourcePicker(false);
    if (!file) return;
    await processImageFile(file);
  }

  function handleOpenImagePicker() {
    if (pending || compressing) return;
    if (shouldPromptImageSource()) {
      setShowImageSourcePicker((open) => !open);
      return;
    }
    fileInputRef.current?.click();
  }

  function handleSelectImageSource(source: "camera" | "file") {
    setShowImageSourcePicker(false);
    if (source === "camera") {
      cameraInputRef.current?.click();
      return;
    }
    fileInputRef.current?.click();
  }

  function handleImageDragOver(event: DragEvent<HTMLButtonElement>) {
    if (pending || compressing) return;
    event.preventDefault();
    setIsDraggingImage(true);
  }

  function handleImageDragLeave() {
    setIsDraggingImage(false);
  }

  async function handleImageDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingImage(false);
    setShowImageSourcePicker(false);
    if (pending || compressing) return;
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    resetImageInputs();
    await processImageFile(file);
  }

  function handleRemoveImage() {
    compressionRequestRef.current += 1;
    setCompressing(false);
    setSelectedImage(null);
    setIsDraggingImage(false);
    setShowImageSourcePicker(false);
    setImageError(null);
    resetImageInputs();
    if (initialLog?.image) {
      setRemoveExistingImage(true);
    }
  }

  function handleRestoreExistingImage() {
    setShowImageSourcePicker(false);
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
    setShowImageSourcePicker(false);
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
  const showPendingRemovalNotice =
    !selectedImage && removeExistingImage && Boolean(initialLog?.image);
  const isImageChooserVisible =
    showImageSourcePicker && !pending && !compressing;
  const activePreviewUrl =
    selectedImage?.previewUrl ??
    (hasExistingImage ? (initialLog?.imageUrl ?? null) : null);

  const previewSystolic = parseWholeNumberInRange(systolicInput, 50, 300);
  const previewDiastolic = parseWholeNumberInRange(diastolicInput, 30, 200);
  const canShowPreviewBadge =
    previewSystolic !== null &&
    previewDiastolic !== null &&
    previewSystolic > previewDiastolic;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={
        isEmbedded
          ? "flex flex-col gap-4"
          : "flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
      }
    >
      {initialLog && <input type="hidden" name="id" value={initialLog.id} />}

      <div className="flex flex-col gap-2.5">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <PulseIcon />
            <span>Readings</span>
          </span>
          {canShowPreviewBadge && (
            <BpStatusBadge
              systolic={previewSystolic}
              diastolic={previewDiastolic}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 sm:gap-3">
          <ReadingField
            name="systolic"
            label="Systolic"
            unit="mmHg"
            placeholder="120"
            defaultValue={initialLog?.systolic}
            required
            paddingRightClass="pr-13"
            onChange={(event) => setSystolicInput(event.currentTarget.value)}
          />
          <ReadingField
            name="diastolic"
            label="Diastolic"
            unit="mmHg"
            placeholder="80"
            defaultValue={initialLog?.diastolic}
            required
            paddingRightClass="pr-13"
            onChange={(event) => setDiastolicInput(event.currentTarget.value)}
          />
          <ReadingField
            name="pulse"
            label="Pulse"
            unit="bpm"
            placeholder="70"
            defaultValue={initialLog?.pulse ?? ""}
            optional
            className="col-span-2 min-[420px]:col-span-1"
            paddingRightClass="pr-11"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={measuredAtId}
              className="flex items-center gap-1.5 text-xs font-medium text-muted"
            >
              <ClockIcon />
              <span>Measured at</span>
            </label>
            {!isEditing && (
              <span className="text-[11px] text-muted">
                Optional · defaults to now
              </span>
            )}
          </div>

          <input
            id={measuredAtId}
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
            className={`w-full min-w-0 rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 ${
              measuredAtError
                ? "border-accent focus:border-accent focus:ring-accent/30"
                : "border-border focus:border-primary focus:ring-primary/30"
            }`}
          />

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

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <PhotoIcon />
              <span>Image</span>
            </span>
            <span className="text-[11px] text-muted">Optional · max 5 MB</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept={BP_IMAGE_ACCEPT}
            onChange={handleImageChange}
            disabled={pending || compressing}
            className="sr-only"
          />
          <input
            ref={cameraInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            disabled={pending || compressing}
            className="sr-only"
          />

          {!selectedImage &&
            !hasExistingImage &&
            !showPendingRemovalNotice &&
            !isImageChooserVisible && (
              <button
                type="button"
                onClick={handleOpenImagePicker}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                disabled={pending || compressing}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS} ${
                  isDraggingImage
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/60 hover:bg-surface-subtle/60"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                  <PhotoIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {compressing
                      ? "Compressing image..."
                      : "Attach monitor photo"}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    JPEG, PNG, WebP, or HEIC
                  </span>
                </span>
              </button>
            )}

          {(selectedImage || hasExistingImage) && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2.5">
              <div className="flex min-w-0 items-center gap-3">
                {activePreviewUrl ? (
                  <BpImage
                    src={activePreviewUrl}
                    alt="Blood pressure monitor preview"
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                    fallback={
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle px-1 text-center text-[11px] text-muted">
                        No preview
                      </span>
                    }
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle px-1 text-center text-[11px] text-muted">
                    Attached
                  </span>
                )}

                <div className="min-w-0">
                  {selectedImage ? (
                    <>
                      <p className="truncate text-xs font-medium text-foreground">
                        {selectedImage.file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatBytes(selectedImage.file.size)}
                        {selectedImage.compressed ? " · compressed" : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-foreground">
                        Existing image attached
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Saved with this record
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenImagePicker}
                  disabled={pending || compressing}
                  className={`cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                >
                  {compressing ? "..." : "Replace"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={pending}
                  className="cursor-pointer rounded-lg border border-accent/40 bg-surface px-2.5 py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {showPendingRemovalNotice && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2.5 text-xs text-muted">
              <span>Image will be removed when saved</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenImagePicker}
                  disabled={pending || compressing}
                  className={`cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                >
                  Upload new
                </button>
                <button
                  type="button"
                  onClick={handleRestoreExistingImage}
                  disabled={pending}
                  className={`cursor-pointer text-xs font-medium text-primary-text underline hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                >
                  Undo
                </button>
              </div>
            </div>
          )}

          {isImageChooserVisible && (
            <ImageSourceChooser
              takePhotoButtonRef={takePhotoButtonRef}
              disabled={pending || compressing}
              onSelectCamera={() => handleSelectImageSource("camera")}
              onSelectFile={() => handleSelectImageSource("file")}
              onCancel={() => setShowImageSourcePicker(false)}
            />
          )}

          {compressing && (selectedImage || hasExistingImage || showPendingRemovalNotice) && (
            <p className="text-xs text-muted">Compressing image...</p>
          )}

          {imageError && (
            <p role="alert" className="text-xs text-accent-text">
              {imageError}
            </p>
          )}
        </div>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-text"
        >
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`flex-1 cursor-pointer rounded-lg border border-border px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS} ${
              isEmbedded ? "bg-background" : "bg-surface"
            }`}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || compressing}
          className={`flex-1 cursor-pointer rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`}
        >
          {pending ? "Saving..." : isEditing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}
