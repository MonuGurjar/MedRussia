import { platformDocumentService } from './platform/documentService';

// Helper to convert file to Base64 (local preview only)
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

export interface UploadResponse {
  secure_url: string; // Storage object path or document ID
  public_id: string;
  format: string;
  resource_type: string;
}

/**
 * Uploads a document directly via MedRussia Platform Document API to private KYC vault.
 * Performs server-side validation, SHA-256 integrity checks, and stores in private bucket.
 * NEVER generates or returns permanent public URLs.
 */
export const uploadFileToCloudinary = async (
  file: File, 
  userId?: string, 
  docType: string = 'passport_front'
): Promise<UploadResponse> => {
  const fileExt = file.name.split('.').pop() || 'pdf';
  
  const docResponse = await platformDocumentService.uploadDocument(docType, file);
  if (docResponse && docResponse.id) {
    return {
      secure_url: docResponse.id,
      public_id: docResponse.id,
      format: fileExt,
      resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
    };
  }

  throw new Error('Document upload did not return a valid document ID.');
};

/**
 * Generates an ephemeral short-lived signed URL (default 15 mins) for viewing or downloading a KYC file.
 * Authenticates user before access; never stores or returns permanent public URLs.
 */
export const getSignedKycUrl = async (
  storagePathOrDocId: string, 
  expiresInSeconds: number = 900
): Promise<string | null> => {
  if (!storagePathOrDocId) return null;

  // If already a local data URL, return for client preview
  if (storagePathOrDocId.startsWith('data:') || storagePathOrDocId.startsWith('blob:')) {
    return storagePathOrDocId;
  }

  try {
    const res = await platformDocumentService.getSignedUrl(storagePathOrDocId);
    if (res && res.signed_url) {
      return res.signed_url;
    }
    return null;
  } catch (e) {
    console.warn('Failed to generate signed URL via Platform API:', e);
    return null;
  }
};

/**
 * Deletes a document file from the private vault via MedRussia Platform API.
 */
export const deleteFileFromCloudinary = async (
  documentId: string, 
  resourceType: string = 'image'
): Promise<void> => {
  try {
    if (documentId && !documentId.startsWith('data:') && !documentId.startsWith('local_')) {
      await platformDocumentService.deleteDocument(documentId);
    }
  } catch (error: any) {
    console.warn('Platform Document Delete Notice:', error);
  }
};
