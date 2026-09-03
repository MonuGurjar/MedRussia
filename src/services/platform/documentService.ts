import { platformApi } from '../../lib/platformApi';
import {
  DocumentUploadResponse,
  SignedUrlResponse,
  MessageResponse
} from '../../types/platform';

export const platformDocumentService = {
  async getMyDocuments(): Promise<DocumentUploadResponse[]> {
    return platformApi.request<DocumentUploadResponse[]>('/api/v1/documents', { method: 'GET' }, true);
  },

  async uploadDocument(
    docType: string,
    file: File,
    applicationId?: string
  ): Promise<DocumentUploadResponse> {
    return platformApi.upload<DocumentUploadResponse>(
      '/api/v1/documents/upload',
      docType,
      file,
      applicationId
    );
  },

  async getSignedUrl(documentId: string): Promise<SignedUrlResponse> {
    return platformApi.request<SignedUrlResponse>(
      `/api/v1/documents/${documentId}/signed-url`,
      { method: 'GET' },
      true
    );
  },

  async deleteDocument(documentId: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      `/api/v1/documents/${documentId}`,
      { method: 'DELETE' },
      true
    );
  }
};
