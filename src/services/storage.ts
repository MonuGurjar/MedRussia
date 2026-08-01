import { supabase } from '../lib/supabase';

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

export interface UploadResponse {
    secure_url: string;
    public_id: string;
    format: string;
    resource_type: string;
}

export const uploadFileToCloudinary = async (file: File): Promise<UploadResponse> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  try {
    // 1. Attempt Direct Supabase Storage Upload
    const { data: uploadData, error: storageError } = await supabase.storage
      .from('medrussia-vault')
      .upload(filePath, file, { upsert: true });

    if (!storageError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('medrussia-vault')
        .getPublicUrl(filePath);

      return {
        secure_url: urlData.publicUrl,
        public_id: filePath,
        format: fileExt,
        resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
      };
    }
  } catch (sErr) {
    console.warn('Supabase storage upload notice:', sErr);
  }

  // 2. Try Serverless Upload API with Safe Response Check
  try {
    const base64Data = await toBase64(file);
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileData: base64Data })
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data && data.secure_url) return data;
      }
    }
  } catch (apiErr) {
    console.warn('/api/upload API notice:', apiErr);
  }

  // 3. Guaranteed Local Fallback (Base64 Data URL)
  const base64Fallback = await toBase64(file);
  return {
    secure_url: base64Fallback,
    public_id: `local_${Date.now()}`,
    format: fileExt,
    resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
  };
};

export const deleteFileFromCloudinary = async (publicId: string, resourceType: string = 'image'): Promise<void> => {
  try {
    if (publicId.startsWith('documents/')) {
      await supabase.storage.from('medrussia-vault').remove([publicId]);
      return;
    }
    if (publicId.startsWith('local_') || publicId.startsWith('fallback_')) {
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType })
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().startsWith('{')) JSON.parse(text);
    }
  } catch (error: any) {
    console.warn("Delete Notice:", error);
  }
};
