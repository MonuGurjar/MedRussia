import { platformApi } from '../../lib/platformApi';
import { tokenManager } from '../../lib/tokenManager';
import {
  RegisterRequest,
  LoginRequest,
  TokenResponse,
  UserProfileResponse,
  UserUpdateRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  MessageResponse
} from '../../types/platform';

export const platformAuthService = {
  async register(data: RegisterRequest): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    );
  },

  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const tokens = await platformApi.request<TokenResponse>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials)
      },
      false
    );
    tokenManager.saveTokens(tokens);
    return tokens;
  },

  async getCurrentUser(): Promise<UserProfileResponse> {
    return platformApi.request<UserProfileResponse>('/api/v1/users/me', { method: 'GET' }, true);
  },

  async updateCurrentUser(data: UserUpdateRequest): Promise<UserProfileResponse> {
    return platformApi.request<UserProfileResponse>(
      '/api/v1/users/me',
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      true
    );
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return platformApi.request<{ avatar_url: string }>(
      '/api/v1/users/me/avatar',
      {
        method: 'POST',
        body: formData
      },
      true
    );
  },

  async logout(): Promise<void> {
    try {
      await platformApi.request<MessageResponse>(
        '/api/v1/auth/logout',
        { method: 'POST' },
        true
      );
    } finally {
      tokenManager.clearTokens();
    }
  },

  async requestPasswordReset(email: string): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      '/api/v1/auth/password-reset/request',
      {
        method: 'POST',
        body: JSON.stringify({ email } as PasswordResetRequest)
      },
      false
    );
  },

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<MessageResponse> {
    return platformApi.request<MessageResponse>(
      '/api/v1/auth/password-reset/confirm',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    );
  }
};
