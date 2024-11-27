import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[A-Za-z0-9]+$/, "Username must only contain letters and numbers")
    .refine((val) => !val.toLowerCase().includes("admin"), {
      message: "Username cannot contain the word 'admin'",
    }),
  email: z
    .string()
    .email("Invalid email format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(50, "Password cannot exceed 50 characters"),
});

// Export type for TypeScript support
export type SignupInput = z.infer<typeof signupSchema>;
