import { platformApi } from '../../lib/platformApi';
import {
  UniversitySummaryResponse,
  UniversityDetailResponse,
  PaginatedData,
  MessageResponse
} from '../../types/platform';

export const platformUniversityService = {
  async getUniversities(params?: {
    page?: number;
    page_size?: number;
    query?: string;
    city?: string;
  }): Promise<PaginatedData<UniversitySummaryResponse>> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.page_size) search.set('page_size', String(params.page_size));
    if (params?.query) search.set('query', params.query);
    if (params?.city) search.set('city', params.city);

    const qs = search.toString() ? `?${search.toString()}` : '';
    return platformApi.request<PaginatedData<UniversitySummaryResponse>>(
      `/api/v1/universities${qs}`,
      { method: 'GET' },
      false
    );
  },

  async getUniversityById(id: string): Promise<UniversityDetailResponse> {
    return platformApi.request<UniversityDetailResponse>(
      `/api/v1/universities/${id}`,
      { method: 'GET' },
      false
    );
  },

  async getShortlists(): Promise<UniversitySummaryResponse[]> {
    return platformApi.request<UniversitySummaryResponse[]>(
      '/api/v1/users/me/shortlists',
      { method: 'GET' },
      true
    );
  },

  async addShortlist(universityId: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      `/api/v1/users/me/shortlists/${universityId}`,
      { method: 'POST' },
      true
    );
  },

  async removeShortlist(universityId: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      `/api/v1/users/me/shortlists/${universityId}`,
      { method: 'DELETE' },
      true
    );
  }
};
