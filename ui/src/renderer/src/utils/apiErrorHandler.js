/**
 * API Error Handler Utilities
 * 
 * Utilities for parsing and handling RFC 9457 compliant API errors.
 * All functions are explicit and require manual invocation.
 */

/**
 * Parse RFC 9457 error response into structured format
 * 
 * @param {Error} error - Axios error object
 * @returns {Object} Parsed error object
 */
export async function parseAPIError(error) {
  // Network error (no response from server)
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      detail: 'Unable to connect to the server. Please check your connection.',
      status: 0,
      title: 'Network Error',
      instance: error.config?.url || 'unknown',
      timestamp: new Date().toISOString(),
      isValidationError: false,
      fieldErrors: {},
      raw: error
    };
  }
  const data = await error.response.json() || {};

  return {
    code: data.code || 'UNKNOWN_ERROR',
    detail: data.detail || 'An error occurred',
    status: data.status,
    title: data.title || 'Error',
    type: data.type,
    instance: data.instance || error.config?.url || 'unknown',
    timestamp: data.timestamp || new Date().toISOString(),
    isValidationError: data.code === 'VALIDATION_ERROR',
    fieldErrors: data.errors || {},
    raw: data
  };
}

/**
 * Simple helper to show error notification
 * 
 * @param {Object} parsed - Parsed error object
 * @param {Function} notify - Notification function from useNotif
 * @param {Object} options - Options for notification
 * @param {string} options.message - Custom error message
 * @param {number} options.duration - Notification duration in ms
 * @param {boolean} options.notifyValidation - Whether to notify for validation errors
 */
export function handleAPIError(parsed, notify, options = {}) {
  if (parsed.isValidationError && !options.notifyValidation) {
    return false;
  }

  notify({
    type: 'error',
    text: options.message || parsed.detail,
    duration: options.duration || 5000
  });

  return true;
}

/**
 * Check if error matches a specific error code
 * 
 * @param {Object} parsed - Parsed error object
 * @param {string} code - Error code to check
 * @returns {boolean}
 */
export function isErrorCode(parsed, code) {
  return parsed.code === code;
}

/**
 * Get field-level validation errors from error response
 * 
 * @param {Object} parsed - Parsed error object
 * @returns {Object} Field errors object
 */
export function getFieldErrors(parsed) {
  return parsed.fieldErrors;
}

/**
 * Get error message from error response
 * 
 * @param {Object} parsed - Parsed error object
 * @param {string} fallback - Fallback message if none found
 * @returns {string}
 */
export function getErrorMessage(parsed, fallback = 'An error occurred') {
  return parsed.detail || fallback;
}

/**
 * Check if error is a validation error
 * 
 * @param {Object} parsed - Parsed error object
 * @returns {boolean}
 */
export function isValidationError(parsed) {
  return parsed.isValidationError;
}

/**
 * Get error status code
 * 
 * @param {Object} parsed - Parsed error object
 * @returns {number}
 */
export function getErrorStatus(parsed) {
  return parsed.status;
}

