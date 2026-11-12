import {
  BP_STATUS_CLASS,
  BP_STATUS_LABEL,
  classifyBp,
} from "@/lib/bp/classify";

export function BpStatusBadge({
  systolic,
  diastolic,
}: {
  systolic: number;
  diastolic: number;
}) {
  const status = classifyBp(systolic, diastolic);
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${BP_STATUS_CLASS[status]}`}
    >
      {BP_STATUS_LABEL[status]}
    </span>
  );
}
