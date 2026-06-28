import { z } from 'zod';

const blockedExtensions = new Set(['exe', 'js', 'php', 'bat', 'sh']);

export const UploadPayloadSchema = z.object({
  fileData: z.string().min(10),
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

export type UploadPayload = z.infer<typeof UploadPayloadSchema>;

export function assertAllowedUpload(input: UploadPayload): { ok: true } {
  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';

  if (blockedExtensions.has(extension)) {
    throw new Error('Blocked file extension');
  }

  const allowedMimePrefixes = ['image/', 'application/pdf'];
  const allowed = allowedMimePrefixes.some((prefix) => input.mimeType.startsWith(prefix));

  if (!allowed) {
    throw new Error('Unsupported MIME type');
  }

  return { ok: true };
}
