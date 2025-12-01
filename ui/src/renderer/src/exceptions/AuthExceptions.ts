/**
 * Custom exceptions for authentication errors
 */

/**
 * Thrown when unable to obtain a valid access token
 * (e.g., refresh token expired or invalid)
 */
export class AuthTokenException extends Error {
    constructor(message = 'Unable to obtain valid access token') {
        super(message);
        this.name = 'AuthTokenException';
    }
}

/**
 * Thrown when login credentials are invalid
 */
export class InvalidCredentialsException extends Error {
    constructor(message = 'Invalid username or password') {
        super(message);
        this.name = 'InvalidCredentialsException';
    }
}

/**
 * Thrown when 2FA token is required but not provided or invalid
 */
export class TwoFactorRequiredException extends Error {
    constructor(message = '2FA token required') {
        super(message);
        this.name = 'TwoFactorRequiredException';
    }
}

/**
 * Thrown when the session has expired and the user needs to re-authenticate.
 * This is separate from network/connection issues - it means the refresh token
 * was rejected by the server (expired, revoked, or invalid).
 */
export class SessionExpiredException extends Error {
    constructor(message = 'Your session has expired. Please log in again.') {
        super(message);
        this.name = 'SessionExpiredException';
    }
}
