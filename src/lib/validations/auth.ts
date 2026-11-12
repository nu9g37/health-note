import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export const signUpSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
