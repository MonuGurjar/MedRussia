import { platformApi } from '../../lib/platformApi';
import {
  ApplicationCreateDto,
  ApplicationResponse,
  MessageResponse
} from '../../types/platform';

export const platformApplicationService = {
  async submitApplication(data: ApplicationCreateDto): Promise<ApplicationResponse> {
    return platformApi.request<ApplicationResponse>(
      '/api/v1/applications',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      true
    );
  },

  async getMyDossier(): Promise<ApplicationResponse> {
    return platformApi.request<ApplicationResponse>(
      '/api/v1/applications/my-dossier',
      { method: 'GET' },
      true
    );
  },

  async getApplicationById(id: string): Promise<ApplicationResponse> {
    return platformApi.request<ApplicationResponse>(
      `/api/v1/applications/${id}`,
      { method: 'GET' },
      true
    );
  },

  async withdrawApplication(id: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      `/api/v1/applications/${id}/withdraw`,
      { method: 'POST' },
      true
    );
  }
};
