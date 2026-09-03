import { platformApi } from '../../lib/platformApi';
import {
  ChatThreadResponse,
  ChatMessageResponse,
  CreateThreadDto,
  ChatMessageCreateDto,
  PaginatedData,
  MessageResponse
} from '../../types/platform';

export const platformChatService = {
  async getMyThreads(): Promise<ChatThreadResponse[]> {
    return platformApi.request<ChatThreadResponse[]>('/api/v1/chats/threads', { method: 'GET' }, true);
  },

  async createThread(dto?: CreateThreadDto): Promise<ChatThreadResponse> {
    return platformApi.request<ChatThreadResponse>(
      '/api/v1/chats/threads',
      {
        method: 'POST',
        body: JSON.stringify(dto || {})
      },
      true
    );
  },

  async getThreadMessages(
    threadId: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedData<ChatMessageResponse>> {
    return platformApi.request<PaginatedData<ChatMessageResponse>>(
      `/api/v1/chats/threads/${threadId}/messages?page=${page}&page_size=${pageSize}`,
      { method: 'GET' },
      true
    );
  },

  async sendMessage(
    threadId: string,
    dto: ChatMessageCreateDto
  ): Promise<ChatMessageResponse> {
    return platformApi.request<ChatMessageResponse>(
      `/api/v1/chats/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(dto)
      },
      true
    );
  },

  async markThreadRead(threadId: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      `/api/v1/chats/threads/${threadId}/read`,
      { method: 'POST' },
      true
    );
  }
};
