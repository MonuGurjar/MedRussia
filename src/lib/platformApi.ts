import { ResponseEnvelope, TokenResponse, ProblemDetails } from '../types/platform';
import { tokenManager } from './tokenManager';
import { PlatformApiError, NetworkApiError } from './platformErrors';

/**
 * Unified HTTP API Client for MedRussia Platform.
 * Supports auto token attachment, single-flight refresh queue, RFC 7807 unwrapping,
 * and multipart uploads.
 */
class PlatformApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(refreshed: boolean) => void> = [];

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_PLATFORM_API_URL ||
      import.meta.env.PLATFORM_API_URL ||
      'http://localhost:8000';
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private onRefreshed(refreshed: boolean): void {
    this.refreshSubscribers.forEach((cb) => cb(refreshed));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (refreshed: boolean) => void): void {
    this.refreshSubscribers.push(cb);
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      tokenManager.clearTokens();
      return false;
    }

    if (this.isRefreshing) {
      return new Promise<boolean>((resolve) => {
        this.addRefreshSubscriber(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const envelope: ResponseEnvelope<TokenResponse> = await response.json();
        if (envelope.data) {
          tokenManager.saveTokens(envelope.data);
          this.onRefreshed(true);
          return true;
        }
      }

      tokenManager.clearTokens();
      this.onRefreshed(false);
      return false;
    } catch {
      tokenManager.clearTokens();
      this.onRefreshed(false);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Request-ID', requestId);

    if (requiresAuth) {
      const token = tokenManager.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 with Token Refresh
      if (response.status === 401 && requiresAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = tokenManager.getAccessToken();
          if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
          }
          response = await fetch(url, {
            ...options,
            headers
          });
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json')) {
        if (!response.ok) {
          throw new PlatformApiError(response.status, null, `Server error (HTTP ${response.status})`);
        }
        return (await response.text()) as unknown as T;
      }

      let jsonBody: any = null;
      try {
        jsonBody = await response.json();
      } catch {
        jsonBody = null;
      }

      if (response.ok) {
        if (jsonBody && typeof jsonBody === 'object' && 'success' in jsonBody && jsonBody.success && jsonBody.data !== null && jsonBody.data !== undefined) {
          return jsonBody.data as T;
        }
        return jsonBody as T;
      }

      // Extract ProblemDetails from RFC 7807 or ResponseEnvelope
      const problem: ProblemDetails | null = jsonBody?.error || (jsonBody && (jsonBody.detail || jsonBody.title || jsonBody.invalid_params) ? jsonBody : null);
      throw PlatformApiError.fromResponse(response.status, problem);
    } catch (e: any) {
      if (e instanceof PlatformApiError) {
        throw e;
      }
      throw new NetworkApiError(e?.message || 'Unable to connect to MedRussia. Please verify your connection.');
    }
  }

  public async upload<T>(
    endpoint: string,
    docType: string,
    file: File,
    applicationId?: string
  ): Promise<T> {
    const formData = new FormData();
    formData.append('doc_type', docType);
    if (applicationId) {
      formData.append('application_id', applicationId);
    }
    formData.append('file', file, file.name);

    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: formData
      },
      true
    );
  }
}

export const platformApi = new PlatformApiClient();
