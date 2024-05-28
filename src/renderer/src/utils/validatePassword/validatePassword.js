/**
 * Regular expression for password validation
 * Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, one digit and one special character
 * @type {RegExp}
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

/**
 * Validates password
 * Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, one digit and one special character
 * @param password
 * @returns {boolean}
 */
export function validatePassword(password){
    return passwordRegex.test(password);
}