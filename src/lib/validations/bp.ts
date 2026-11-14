import { z } from "zod";
import {
  BP_IMAGE_MAX_BYTES,
  isAllowedBpImageFile,
  isUploadedFile,
} from "@/lib/bp/image";

export const bpFormSchema = z
  .object({
    systolic: z.coerce
      .number("Please enter a number")
      .int("Must be a whole number")
      .min(50, "Systolic is too low (minimum 50)")
      .max(300, "Systolic is too high (maximum 300)"),
    diastolic: z.coerce
      .number("Please enter a number")
      .int("Must be a whole number")
      .min(30, "Diastolic is too low (minimum 30)")
      .max(200, "Diastolic is too high (maximum 200)"),
    pulse: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.coerce
        .number("Please enter a number")
        .int("Must be a whole number")
        .min(30, "Pulse is too low (minimum 30)")
        .max(250, "Pulse is too high (maximum 250)")
        .optional(),
    ),
    measuredAt: z.string().optional(),
    image: z.preprocess(
      (v) => {
        if (v == null || v === "") return undefined;
        if (isUploadedFile(v) && v.size === 0) return undefined;
        return v;
      },
      z
        .custom<File>(isUploadedFile, "Invalid image file")
        .refine((file) => file.size <= BP_IMAGE_MAX_BYTES, {
          message: "Image must be 5 MB or smaller",
        })
        .refine((file) => isAllowedBpImageFile(file), {
          message: "Image must be a JPEG, PNG, WebP, or HEIC file",
        })
        .optional(),
    ),
    removeImage: z
      .preprocess((v) => v === "true" || v === true, z.boolean())
      .optional(),
  })
  .refine((data) => data.systolic > data.diastolic, {
    message: "Systolic must be greater than diastolic",
    path: ["systolic"],
  });

export type BpFormValues = z.infer<typeof bpFormSchema>;
