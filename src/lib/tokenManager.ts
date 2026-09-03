import { TokenResponse } from '../types/platform';

/**
 * Secure Token Storage & Lifecycle Manager for Web.
 * Sensitive tokens are never logged to console.
 */
class WebTokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'mr_plat_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'mr_plat_refresh_token';

  private inMemoryAccessToken: string | null = null;
  private inMemoryRefreshToken: string | null = null;

  constructor() {
    this.inMemoryAccessToken = localStorage.getItem(WebTokenManager.ACCESS_TOKEN_KEY);
    this.inMemoryRefreshToken = localStorage.getItem(WebTokenManager.REFRESH_TOKEN_KEY);
  }

  public saveTokens(tokens: TokenResponse): void {
    this.inMemoryAccessToken = tokens.access_token;
    this.inMemoryRefreshToken = tokens.refresh_token;

    try {
      localStorage.setItem(WebTokenManager.ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(WebTokenManager.REFRESH_TOKEN_KEY, tokens.refresh_token);
    } catch {
      // Storage unavailable / quota exceeded
    }
  }

  public getAccessToken(): string | null {
    if (!this.inMemoryAccessToken) {
      this.inMemoryAccessToken = localStorage.getItem(WebTokenManager.ACCESS_TOKEN_KEY);
    }
    return this.inMemoryAccessToken;
  }

  public getRefreshToken(): string | null {
    if (!this.inMemoryRefreshToken) {
      this.inMemoryRefreshToken = localStorage.getItem(WebTokenManager.REFRESH_TOKEN_KEY);
    }
    return this.inMemoryRefreshToken;
  }

  public clearTokens(): void {
    this.inMemoryAccessToken = null;
    this.inMemoryRefreshToken = null;

    try {
      localStorage.removeItem(WebTokenManager.ACCESS_TOKEN_KEY);
      localStorage.removeItem(WebTokenManager.REFRESH_TOKEN_KEY);
    } catch {
      // Storage unavailable
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }
}

export const tokenManager = new WebTokenManager();
