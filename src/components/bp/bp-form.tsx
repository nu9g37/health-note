"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBpLog } from "@/actions/bp-logs";

export function BpForm() {
  const [state, action, pending] = useActionState(createBpLog, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  function handleAction(formData: FormData) {
    const local = formData.get("measuredAt");
    if (typeof local === "string" && local) {
      formData.set("measuredAt", new Date(local).toISOString());
    }
    action(formData);
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Systolic
          <input
            name="systolic"
            type="number"
            inputMode="numeric"
            required
            placeholder="120"
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
            className="rounded-lg border px-3 py-3 text-lg"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Measured at (optional, defaults to now)
        <input
          name="measuredAt"
          type="datetime-local"
          className="rounded-lg border px-3 py-3 text-base"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
