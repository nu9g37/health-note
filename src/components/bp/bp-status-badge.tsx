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
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${BP_STATUS_CLASS[status]}`}
    >
      {BP_STATUS_LABEL[status]}
    </span>
  );
}
