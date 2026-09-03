import { tokenManager } from '../lib/tokenManager';
import {
  PlatformApiError,
  BadRequestApiError,
  UnauthorizedApiError,
  ForbiddenApiError,
  NotFoundApiError,
  ConflictApiError,
  ValidationApiError,
  RateLimitApiError
} from '../lib/platformErrors';
import { ProblemDetails, TokenResponse } from '../types/platform';

/**
 * Web Platform API Integration & DTO Verification Tests
 */
export function runPlatformApiTests(): boolean {
  console.log('--- Running Web Platform API Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName}`);
      failed++;
    }
  }

  // 1. Token Manager Test
  try {
    tokenManager.clearTokens();
    assert(!tokenManager.isAuthenticated(), 'TokenManager starts unauthenticated');
    assert(tokenManager.getAccessToken() === null, 'AccessToken is initially null');

    const testTokens: TokenResponse = {
      access_token: 'test_access_jwt',
      refresh_token: 'test_refresh_token',
      expires_in_seconds: 900
    };
    tokenManager.saveTokens(testTokens);

    assert(tokenManager.isAuthenticated(), 'TokenManager is authenticated after saving tokens');
    assert(tokenManager.getAccessToken() === 'test_access_jwt', 'AccessToken matches saved token');
    assert(tokenManager.getRefreshToken() === 'test_refresh_token', 'RefreshToken matches saved token');

    tokenManager.clearTokens();
    assert(!tokenManager.isAuthenticated(), 'TokenManager is unauthenticated after clearTokens');
  } catch (e: any) {
    console.error('TokenManager test failure:', e);
    failed++;
  }

  // 2. RFC 7807 Error Mapping Test
  try {
    const p400: ProblemDetails = { type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid field', code: 'BAD_REQUEST' };
    const err400 = PlatformApiError.fromResponse(400, p400);
    assert(err400 instanceof BadRequestApiError, 'Status 400 maps to BadRequestApiError');
    assert(err400.statusCode === 400, 'Status 400 has correct statusCode');
    assert(err400.code === 'BAD_REQUEST', 'Status 400 has correct code');

    const p401: ProblemDetails = { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Token expired', code: 'UNAUTHORIZED' };
    const err401 = PlatformApiError.fromResponse(401, p401);
    assert(err401 instanceof UnauthorizedApiError, 'Status 401 maps to UnauthorizedApiError');

    const p403: ProblemDetails = { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'Forbidden', code: 'FORBIDDEN' };
    const err403 = PlatformApiError.fromResponse(403, p403);
    assert(err403 instanceof ForbiddenApiError, 'Status 403 maps to ForbiddenApiError');

    const p404: ProblemDetails = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Not found', code: 'NOT_FOUND' };
    const err404 = PlatformApiError.fromResponse(404, p404);
    assert(err404 instanceof NotFoundApiError, 'Status 404 maps to NotFoundApiError');

    const p409: ProblemDetails = { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Duplicate record', code: 'CONFLICT' };
    const err409 = PlatformApiError.fromResponse(409, p409);
    assert(err409 instanceof ConflictApiError, 'Status 409 maps to ConflictApiError');

    const p422: ProblemDetails = {
      type: 'about:blank',
      title: 'Validation Error',
      status: 422,
      detail: 'Invalid input',
      code: 'VALIDATION_FAILED',
      invalid_params: [{ name: 'email', reason: 'Must be valid email', type: 'value_error' }]
    };
    const err422 = PlatformApiError.fromResponse(422, p422);
    assert(err422 instanceof ValidationApiError, 'Status 422 maps to ValidationApiError');
    assert(err422.invalidParams?.length === 1, 'Status 422 preserves invalidParams');

    const p429: ProblemDetails = { type: 'about:blank', title: 'Rate Limit', status: 429, detail: 'Too many requests', code: 'RATE_LIMIT' };
    const err429 = PlatformApiError.fromResponse(429, p429);
    assert(err429 instanceof RateLimitApiError, 'Status 429 maps to RateLimitApiError');

    const p500: ProblemDetails = { type: 'about:blank', title: 'Server Error', status: 500, detail: 'DB crash', code: 'INTERNAL_ERROR' };
    const err500 = PlatformApiError.fromResponse(500, p500);
    assert(err500 instanceof PlatformApiError, 'Status 500 maps to PlatformApiError');
    assert(err500.statusCode === 500, 'Status 500 has correct statusCode');
  } catch (e: any) {
    console.error('RFC 7807 Error test failure:', e);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
}
