import { ProblemDetails, InvalidParam } from '../types/platform';

/**
 * Standardized RFC 7807 Exception hierarchy for Web.
 */
export class PlatformApiError extends Error {
  public readonly statusCode: number;
  public readonly problem: ProblemDetails | null;
  public readonly code: string;
  public readonly invalidParams?: InvalidParam[] | null;
  public readonly requestId?: string | null;

  constructor(statusCode: number, problem?: ProblemDetails | null, fallbackMessage?: string) {
    let msg = problem?.detail || fallbackMessage || `Request failed (HTTP ${statusCode})`;
    
    // Extract parameter error reasons if present
    if (problem?.invalid_params && problem.invalid_params.length > 0) {
      const details = problem.invalid_params.map(p => p.reason).filter(Boolean).join('. ');
      if (details) {
        msg = details;
      }
    }
    
    super(msg);
    this.name = 'PlatformApiError';
    this.statusCode = statusCode;
    this.problem = problem || null;
    this.code = problem?.code || 'UNKNOWN_ERROR';
    this.invalidParams = problem?.invalid_params || null;
    this.requestId = problem?.request_id || null;
  }

  /**
   * Maps server validation errors or conflicts into field-specific error messages.
   */
  public getFieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (this.invalidParams && this.invalidParams.length > 0) {
      for (const param of this.invalidParams) {
        // e.g. "body.password" -> "password", "body.email" -> "email"
        const fieldName = param.name.replace(/^(body|query|path)\./, '');
        if (fieldName) {
          errors[fieldName] = param.reason;
        }
      }
    }

    if (this.statusCode === 409 && this.problem?.detail) {
      const detailLower = this.problem.detail.toLowerCase();
      if (detailLower.includes('email')) {
        errors['email'] = this.problem.detail;
      } else if (detailLower.includes('username')) {
        errors['username'] = this.problem.detail;
      }
    }

    return errors;
  }

  static fromResponse(statusCode: number, problem?: ProblemDetails | null): PlatformApiError {
    switch (statusCode) {
      case 400:
        return new BadRequestApiError(problem);
      case 401:
        return new UnauthorizedApiError(problem);
      case 403:
        return new ForbiddenApiError(problem);
      case 404:
        return new NotFoundApiError(problem);
      case 409:
        return new ConflictApiError(problem);
      case 422:
        return new ValidationApiError(problem);
      case 429:
        return new RateLimitApiError(problem);
      default:
        return new PlatformApiError(statusCode, problem);
    }
  }
}

export class BadRequestApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(400, problem, 'Invalid request parameters.');
    this.name = 'BadRequestApiError';
  }
}

export class UnauthorizedApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(401, problem, 'Incorrect email/username or password.');
    this.name = 'UnauthorizedApiError';
  }
}

export class ForbiddenApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(403, problem, 'Access denied. You do not have permission.');
    this.name = 'ForbiddenApiError';
  }
}

export class NotFoundApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(404, problem, 'The requested resource was not found.');
    this.name = 'NotFoundApiError';
  }
}

export class ConflictApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(409, problem, 'An account with these details already exists.');
    this.name = 'ConflictApiError';
  }
}

export class ValidationApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(422, problem, 'Please verify the highlighted fields and try again.');
    this.name = 'ValidationApiError';
  }
}

export class RateLimitApiError extends PlatformApiError {
  constructor(problem?: ProblemDetails | null) {
    super(429, problem, 'Too many requests. Please wait a moment and try again.');
    this.name = 'RateLimitApiError';
  }
}

export class NetworkApiError extends PlatformApiError {
  constructor(message?: string) {
    super(0, null, message || 'Unable to connect to MedRussia. Please verify your connection.');
    this.name = 'NetworkApiError';
  }
}
