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
  normal:
    "border border-secondary/60 bg-secondary/20 text-secondary-text dark:border-secondary/45 dark:bg-secondary/15 dark:text-secondary",
  elevated:
    "border border-amber-400/60 bg-amber-100 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
  high: "border border-accent/45 bg-accent/15 text-accent-text dark:border-accent/45 dark:bg-accent/15 dark:text-accent",
};
