// Type ชั่วคราว (เขียนมือ) — เมื่อรัน `npx supabase gen types typescript`
// แล้ว ให้เปลี่ยนไปใช้ type จาก ./database.types.ts แทน
export interface BpLog {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export type BpLogInsert = Pick<BpLog, "systolic" | "diastolic"> &
  Partial<Pick<BpLog, "pulse" | "measured_at">>;
