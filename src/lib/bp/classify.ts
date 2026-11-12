export type BpStatus = "normal" | "elevated" | "high";

export function classifyBp(systolic: number, diastolic: number): BpStatus {
  if (systolic >= 140 || diastolic >= 90) return "high";
  if (systolic >= 120 || diastolic >= 80) return "elevated";
  return "normal";
}

export const BP_STATUS_LABEL: Record<BpStatus, string> = {
  normal: "Normal",
  elevated: "Elevated",
  high: "High",
};

export const BP_STATUS_CLASS: Record<BpStatus, string> = {
  normal: "bg-green-100 text-green-800",
  elevated: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};
