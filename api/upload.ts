
import crypto from 'crypto';
import { UploadPayloadSchema, assertAllowedUpload } from './security/validation';
import { checkRateLimit } from './security/rateLimit';
import { createAuditLog } from './models/auditLog';
import { requireAuth } from './security/auth';
import { getClientIp, getUserAgent } from './lib/request';

type CloudinaryCreds = {
  cloudName: string;
  apiKey: string | null;
  apiSecret: string | null;
  uploadPreset?: string;
};

const getCreds = (): CloudinaryCreds | null => {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    };
  }

  if (process.env.CLOUDINARY_URL) {
    const regex = /cloudinary:\/\/([^:]+):([^@]+)@(.+)/;
    const match = process.env.CLOUDINARY_URL.match(regex);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3],
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
      };
    }
  }

  return null;
};

export default async function handler(request, response) {
  const auth = await requireAuth(request, response);
  if (!auth) return;

  const creds = getCreds();
  if (!creds) {
    return response.status(500).json({ error: 'Storage configuration missing on server' });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  if (request.method === 'DELETE') {
    if (!creds.apiKey || !creds.apiSecret) {
      return response.status(500).json({ error: 'API Key/Secret required for deletion' });
    }

    const { public_id, resource_type = 'image' } = request.body || {};
    if (!public_id) {
      return response.status(400).json({ error: 'public_id is required' });
    }

    const timestamp = Math.round(Date.now() / 1000).toString();
    const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(paramsToSign + creds.apiSecret).digest('hex');

    const formData = new FormData();
    formData.append('public_id', public_id);
    formData.append('api_key', creds.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}/${resource_type}/destroy`;

    try {
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.result !== 'ok' && data.result !== 'not found') {
        throw new Error(data.error?.message || 'Cloudinary delete failed');
      }

      await createAuditLog({
        userId: auth.userId,
        userRole: auth.role,
        action: 'DELETE_DOCUMENT',
        entityType: 'document',
        entityId: public_id,
        description: 'User deleted a document from Cloudinary',
        ip,
        userAgent,
        status: 'success',
      });

      return response.status(200).json({ success: true, result: data });
    } catch (error) {
      await createAuditLog({
        userId: auth.userId,
        userRole: auth.role,
        action: 'DELETE_DOCUMENT',
        entityType: 'document',
        entityId: public_id,
        description: 'Failed to delete document from Cloudinary',
        ip,
        userAgent,
        status: 'failed',
      });

      return response.status(500).json({ error: error.message });
    }
  }

  if (request.method === 'POST') {
    const rl = await checkRateLimit(auth.userId || ip, 'upload');
    if (!rl.allowed) {
      return response
        .status(429)
        .setHeader('Retry-After', String(rl.retryAfterSeconds))
        .json({ error: 'Too many upload requests' });
    }

    try {
      const parsed = UploadPayloadSchema.parse(request.body);
      assertAllowedUpload(parsed);

      const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}/auto/upload`;
      const formData = new FormData();
      formData.append('file', parsed.fileData);
      if (creds.uploadPreset) {
        formData.append('upload_preset', creds.uploadPreset);
      }

      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Upload failed');
      }

      await createAuditLog({
        userId: auth.userId,
        userRole: auth.role,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'document',
        entityId: data.public_id,
        description: 'User uploaded a document to Cloudinary',
        ip,
        userAgent,
        status: 'success',
      });

      return response.status(200).json({
        secure_url: data.secure_url,
        public_id: data.public_id,
        format: data.format,
        resource_type: data.resource_type,
      });
    } catch (error) {
      await createAuditLog({
        userId: auth.userId,
        userRole: auth.role,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'document',
        entityId: 'unknown',
        description: `Upload failed: ${error.message || 'Unknown error'}`,
        ip,
        userAgent,
        status: 'failed',
      });

      return response.status(400).json({ error: error.message || 'Invalid upload request' });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
