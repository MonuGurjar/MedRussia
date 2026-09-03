import { platformApi } from '../../lib/platformApi';
import {
  AdminStatsResponse,
  ApplicationResponse,
  StageTransitionDto,
  DocumentUploadResponse,
  VerifyDocumentDto,
  InquiryResponse,
  InquiryReplyDto,
  InquiryReplyResponse,
  PaginatedData,
  MessageResponse
} from '../../types/platform';

export interface ForexOverrideDto {
  target_currency: string;
  spot_rate: number;
  hedged_budget_rate: number;
  source?: string;
}

export const platformAdminService = {
  async getStats(): Promise<AdminStatsResponse> {
    return platformApi.request<AdminStatsResponse>('/api/v1/admin/stats', { method: 'GET' }, true);
  },

  async listApplications(
    stage?: string,
    universityId?: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedData<ApplicationResponse>> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    if (stage) params.append('stage', stage);
    if (universityId) params.append('university_id', universityId);

    return platformApi.request<PaginatedData<ApplicationResponse>>(
      `/api/v1/admin/applications?${params.toString()}`,
      { method: 'GET' },
      true
    );
  },

  async transitionStage(
    applicationId: string,
    dto: StageTransitionDto
  ): Promise<ApplicationResponse> {
    return platformApi.request<ApplicationResponse>(
      `/api/v1/admin/applications/${applicationId}/stage`,
      {
        method: 'POST',
        body: JSON.stringify(dto)
      },
      true
    );
  },

  async verifyDocument(
    documentId: string,
    dto: VerifyDocumentDto
  ): Promise<DocumentUploadResponse> {
    return platformApi.request<DocumentUploadResponse>(
      `/api/v1/admin/documents/${documentId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify(dto)
      },
      true
    );
  },

  async overrideForex(dto: ForexOverrideDto): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      '/api/v1/admin/forex',
      {
        method: 'POST',
        body: JSON.stringify(dto)
      },
      true
    );
  },

  async listInquiries(
    status?: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedData<InquiryResponse>> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    if (status) params.append('status', status);

    return platformApi.request<PaginatedData<InquiryResponse>>(
      `/api/v1/admin/inquiries?${params.toString()}`,
      { method: 'GET' },
      true
    );
  },

  async replyInquiry(
    inquiryId: string,
    dto: InquiryReplyDto
  ): Promise<InquiryReplyResponse> {
    return platformApi.request<InquiryReplyResponse>(
      `/api/v1/admin/inquiries/${inquiryId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(dto)
      },
      true
    );
  }
};
