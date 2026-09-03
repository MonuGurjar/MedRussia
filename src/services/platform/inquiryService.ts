import { platformApi } from '../../lib/platformApi';
import {
  InquiryCreateDto,
  InquiryResponse,
  CallBookingCreateDto,
  CallBookingResponse,
  PlatformFeedbackCreateDto,
  PlatformFeedbackResponse
} from '../../types/platform';

export const platformInquiryService = {
  async submitInquiry(data: InquiryCreateDto): Promise<InquiryResponse> {
    return platformApi.request<InquiryResponse>(
      '/api/v1/inquiries',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    );
  },

  async getMyInquiries(): Promise<InquiryResponse[]> {
    return platformApi.request<InquiryResponse[]>('/api/v1/inquiries/me', { method: 'GET' }, true);
  },

  async bookCall(data: CallBookingCreateDto): Promise<CallBookingResponse> {
    return platformApi.request<CallBookingResponse>(
      '/api/v1/inquiries/bookings',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    );
  },

  async submitFeedback(data: PlatformFeedbackCreateDto): Promise<PlatformFeedbackResponse> {
    return platformApi.request<PlatformFeedbackResponse>(
      '/api/v1/inquiries/feedback',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    );
  }
};
