import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(), // Not required for updates
  role: z.enum(["student", "admin"]).default("student"),
});

export const FeedbackSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  type: z.enum(["admission", "fee", "general"]),
});

export const FileUploadSchema = z.object({
  fileBase64: z.string(),
  fileName: z.string(),
  fileType: z.string().regex(/^(image\/(jpeg|png)|application\/pdf)$/, "Invalid file type. Only JPEG, PNG, and PDF are allowed."),
});

// Helper for validating API requests
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: any): { success: boolean; data?: T; error?: string } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: (result as any).error.errors.map((e: any) => e.message).join(', ') };
};
