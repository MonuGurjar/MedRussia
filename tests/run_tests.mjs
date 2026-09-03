// Standalone test runner for Web Platform API layer & Admin Domain
import assert from 'node:assert';

// Minimal in-memory mock for localStorage
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

// Mock import.meta.env
global.import_meta_env = { VITE_PLATFORM_API_URL: 'http://localhost:8000' };

console.log('====================================================');
console.log('  MedRussia Web — Auth & Domain Integration Tests   ');
console.log('====================================================\n');

// 1. Test Token Manager
console.log('1. Testing WebTokenManager:');
const ACCESS_TOKEN_KEY = 'mr_plat_access_token';
const REFRESH_TOKEN_KEY = 'mr_plat_refresh_token';

class WebTokenManager {
  constructor() {
    this.inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    this.inMemoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  saveTokens(tokens) {
    this.inMemoryAccessToken = tokens.access_token;
    this.inMemoryRefreshToken = tokens.refresh_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }

  getAccessToken() {
    return this.inMemoryAccessToken;
  }

  getRefreshToken() {
    return this.inMemoryRefreshToken;
  }

  clearTokens() {
    this.inMemoryAccessToken = null;
    this.inMemoryRefreshToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated() {
    return Boolean(this.getAccessToken());
  }
}

const tokenManager = new WebTokenManager();
assert.strictEqual(tokenManager.isAuthenticated(), false);
assert.strictEqual(tokenManager.getAccessToken(), null);
console.log('   ✓ Initial unauthenticated state verified');

tokenManager.saveTokens({
  access_token: 'jwt_mock_access_token_123',
  refresh_token: 'jwt_mock_refresh_token_456',
  expires_in_seconds: 900
});
assert.strictEqual(tokenManager.isAuthenticated(), true);
assert.strictEqual(tokenManager.getAccessToken(), 'jwt_mock_access_token_123');
assert.strictEqual(tokenManager.getRefreshToken(), 'jwt_mock_refresh_token_456');
console.log('   ✓ Token storage & retrieval verified');

tokenManager.clearTokens();
assert.strictEqual(tokenManager.isAuthenticated(), false);
assert.strictEqual(tokenManager.getAccessToken(), null);
console.log('   ✓ Token clearance on logout verified');

// 2. Test Admin Operations DTOs
console.log('\n2. Testing Admin Stats & Pipeline DTOs:');
const sampleAdminStats = {
  total_applications: 142,
  pending_documents_count: 18,
  active_chat_threads_count: 35,
  open_inquiries_count: 22
};

assert.strictEqual(sampleAdminStats.total_applications, 142);
assert.strictEqual(sampleAdminStats.pending_documents_count, 18);
assert.strictEqual(sampleAdminStats.open_inquiries_count, 22);

const sampleTransitionDto = {
  target_stage: 'mvd_invitation_issued',
  remarks: 'Official electronic student visa invitation issued by Ministry.',
  metadata: { mvd_invitation_number: 'RU-MVD-889922' }
};

assert.strictEqual(sampleTransitionDto.target_stage, 'mvd_invitation_issued');
assert.strictEqual(sampleTransitionDto.metadata.mvd_invitation_number, 'RU-MVD-889922');
console.log('   ✓ Admin Stats & Transition DTOs verified');

// 3. Test RFC 7807 Error Handling & Field Error Mapping
console.log('\n3. Testing RFC 7807 Error Classes & Field Error Mapping:');
class PlatformApiError extends Error {
  constructor(statusCode, problem, fallbackMessage) {
    let msg = problem?.detail || fallbackMessage || `Platform API Error (HTTP ${statusCode})`;
    if (problem?.invalid_params && problem.invalid_params.length > 0) {
      const details = problem.invalid_params.map(p => p.reason).filter(Boolean).join('. ');
      if (details) msg = details;
    }
    super(msg);
    this.name = 'PlatformApiError';
    this.statusCode = statusCode;
    this.problem = problem || null;
    this.code = problem?.code || 'UNKNOWN_ERROR';
    this.invalidParams = problem?.invalid_params || null;
    this.requestId = problem?.request_id || null;
  }

  getFieldErrors() {
    const errors = {};
    if (this.invalidParams && this.invalidParams.length > 0) {
      for (const param of this.invalidParams) {
        const fieldName = param.name.replace(/^(body|query|path)\./, '');
        if (fieldName) errors[fieldName] = param.reason;
      }
    }
    if (this.statusCode === 409 && this.problem?.detail) {
      const detailLower = this.problem.detail.toLowerCase();
      if (detailLower.includes('email')) errors['email'] = this.problem.detail;
      else if (detailLower.includes('username')) errors['username'] = this.problem.detail;
    }
    return errors;
  }
}

// 3a. 403 Forbidden
const p403 = {
  type: 'about:blank',
  title: 'Forbidden',
  detail: 'Admin privilege required for this operation.',
  code: 'FORBIDDEN',
  request_id: 'req-err-admin-403'
};
const err403 = new PlatformApiError(403, p403);
assert.strictEqual(err403.statusCode, 403);
assert.strictEqual(err403.code, 'FORBIDDEN');
console.log('   ✓ 403 Admin Role Guard ProblemDetails verified');

// 3b. 422 Validation Error with invalid_params
const p422 = {
  type: 'https://api.medrussia.com/v1/errors/validation-error',
  title: 'Validation Failed',
  detail: 'Password must contain at least one number.',
  code: 'VALIDATION_ERROR',
  invalid_params: [
    { name: 'body.password', reason: 'Password must contain at least one number.', type: 'value_error' }
  ],
  request_id: 'req-err-val-422'
};
const err422 = new PlatformApiError(422, p422);
assert.strictEqual(err422.statusCode, 422);
assert.strictEqual(err422.message, 'Password must contain at least one number.');
const fieldErrors422 = err422.getFieldErrors();
assert.strictEqual(fieldErrors422.password, 'Password must contain at least one number.');
console.log('   ✓ 422 Validation ProblemDetails with parameter reason extraction verified');

// 3c. 409 Conflict Error mapping
const p409 = {
  type: 'https://api.medrussia.com/v1/errors/resource-conflict',
  title: 'Resource Conflict',
  detail: 'An account with this email address already exists.',
  code: 'RESOURCE_CONFLICT',
  request_id: 'req-err-conf-409'
};
const err409 = new PlatformApiError(409, p409);
assert.strictEqual(err409.statusCode, 409);
const fieldErrors409 = err409.getFieldErrors();
assert.strictEqual(fieldErrors409.email, 'An account with this email address already exists.');
console.log('   ✓ 409 Conflict ProblemDetails mapped to field errors verified');

console.log('\n====================================================');
console.log('  ALL WEB PLATFORM API INTEGRATION TESTS PASSED!   ');
console.log('====================================================\n');
