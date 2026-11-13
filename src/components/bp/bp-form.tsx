"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type SubmitEvent,
} from "react";
import { createBpLog, updateBpLog } from "@/actions/bp-logs";
import type { BpLog } from "@/types";

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface BpFormProps {
  initialLog?: BpLog;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BpForm({ initialLog, onSuccess, onCancel }: BpFormProps) {
  const isEditing = Boolean(initialLog);
  const [state, action, pending] = useActionState(
    isEditing ? updateBpLog : createBpLog,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.success) return;
    if (isEditing) {
      onSuccess?.();
    } else {
      formRef.current?.reset();
    }
  }, [state, isEditing, onSuccess]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const local = formData.get("measuredAt");
    if (typeof local === "string" && local) {
      formData.set("measuredAt", new Date(local).toISOString());
    }
    startTransition(() => {
      action(formData);
    });
  }

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
          disabled={pending}
          className="flex-1 rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : isEditing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}
