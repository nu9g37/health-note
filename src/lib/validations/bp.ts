import { z } from "zod";

export const bpFormSchema = z
  .object({
    systolic: z.coerce
      .number("กรุณากรอกตัวเลข")
      .int("ต้องเป็นจำนวนเต็ม")
      .min(50, "ค่าความดันตัวบนต่ำเกินไป (ขั้นต่ำ 50)")
      .max(300, "ค่าความดันตัวบนสูงเกินไป (ไม่เกิน 300)"),
    diastolic: z.coerce
      .number("กรุณากรอกตัวเลข")
      .int("ต้องเป็นจำนวนเต็ม")
      .min(30, "ค่าความดันตัวล่างต่ำเกินไป (ขั้นต่ำ 30)")
      .max(200, "ค่าความดันตัวล่างสูงเกินไป (ไม่เกิน 200)"),
    // ช่องว่าง -> undefined
    pulse: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.coerce
        .number("กรุณากรอกตัวเลข")
        .int("ต้องเป็นจำนวนเต็ม")
        .min(30, "ค่าชีพจรต่ำเกินไป (ขั้นต่ำ 30)")
        .max(250, "ค่าชีพจรสูงเกินไป (ไม่เกิน 250)")
        .optional(),
    ),
    measuredAt: z.string().optional(),
  })
  .refine((data) => data.systolic > data.diastolic, {
    message: "ค่าความดันตัวบน (Systolic) ต้องมากกว่าตัวล่าง (Diastolic) เสมอ",
    path: ["systolic"],
  });

export type BpFormValues = z.infer<typeof bpFormSchema>;
