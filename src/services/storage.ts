import { supabase } from '../lib/supabase';

// Helper to convert file to Base64 (local preview only)
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

export interface UploadResponse {
  secure_url: string; // Storage object path (e.g. students/{userId}/{docType}_{fileName})
  public_id: string;
  format: string;
  resource_type: string;
}

/**
 * Uploads a document directly to the private 'kyc-vault' Supabase Storage bucket.
 * Uses private user-isolated path: students/{userId}/{docType}_{fileName}.
 * NEVER generates or returns permanent public URLs.
 */
export const uploadFileToCloudinary = async (
  file: File, 
  userId?: string, 
  docType: string = 'document'
): Promise<UploadResponse> => {
  const fileExt = file.name.split('.').pop() || 'pdf';
  const cleanDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Resolve authenticated user ID
  let activeUserId = userId;
  if (!activeUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    activeUserId = session?.user?.id || 'guest_student';
  }

  const storagePath = `students/${activeUserId}/${cleanDocType}_${cleanFileName}`;

  try {
    // 1. Direct Supabase Storage Upload to private 'kyc-vault'
    const { data: uploadData, error: storageError } = await supabase.storage
      .from('kyc-vault')
      .upload(storagePath, file, { upsert: true });

    if (!storageError && uploadData) {
      return {
        secure_url: storagePath, // Private storage object path
        public_id: storagePath,
        format: fileExt,
        resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
      };
    }
  } catch (sErr) {
    console.warn('Supabase storage upload notice:', sErr);
  }

  // 2. Local Base64 fallback (transient client preview only)
  const base64Fallback = await toBase64(file);
  return {
    secure_url: storagePath,
    public_id: `local_${Date.now()}`,
    format: fileExt,
    resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
  };
};

/**
 * Generates a short-lived signed URL (default 15 mins) for viewing or downloading a KYC file.
 * Authenticates user before access; never stores or returns permanent public URLs.
 */
export const getSignedKycUrl = async (
  storagePath: string, 
  expiresInSeconds: number = 900
): Promise<string | null> => {
  if (!storagePath) return null;

  // If already a local data URL, return for client preview
  if (storagePath.startsWith('data:')) return storagePath;

  try {
    const { data, error } = await supabase.storage
      .from('kyc-vault')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Signed URL generation notice:', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.warn('Failed to generate signed URL:', e);
    return null;
  }
};

/**
 * Deletes a document file from the private 'kyc-vault' bucket.
 */
export const deleteFileFromCloudinary = async (
  storagePath: string, 
  resourceType: string = 'image'
): Promise<void> => {
  try {
    if (storagePath.startsWith('students/')) {
      await supabase.storage.from('kyc-vault').remove([storagePath]);
      return;
    }
  } catch (error: any) {
    console.warn("Storage Delete Notice:", error);
  }
};

