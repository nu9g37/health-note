import { z } from "zod";

const passwordConfirmationFields = {
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
};

function passwordsMatch(d: { password: string; confirmPassword: string }) {
  return d.password === d.confirmPassword;
}

const passwordMismatchError = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export const signUpSchema = z
  .object({
    email: z.email("Invalid email address"),
    ...passwordConfirmationFields,
  })
  .refine(passwordsMatch, passwordMismatchError);

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object(passwordConfirmationFields)
  .refine(passwordsMatch, passwordMismatchError);
