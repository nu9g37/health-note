export interface BpLog {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string;
  created_at: string;
  updated_at: string;
}

export type BpLogInsert = Pick<BpLog, "systolic" | "diastolic"> &
  Partial<Pick<BpLog, "pulse" | "measured_at">>;
