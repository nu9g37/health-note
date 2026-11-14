export interface BpLog {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  image: string | null;
  measured_at: string;
  created_at: string;
  updated_at: string;
}

export type BpLogInsert = Pick<BpLog, "systolic" | "diastolic"> &
  Partial<Pick<BpLog, "pulse" | "image" | "measured_at">>;

export interface BpLogWithImageUrl extends BpLog {
  imageUrl?: string | null;
}
