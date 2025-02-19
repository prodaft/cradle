/**
 * Regular expression for password validation
 * Password must contain at least 8 characters, including at least one upperentity letter, one lowerentity letter, one digit and one special character
 * @type {RegExp}
 */
const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~])[A-Za-z\d !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{12,}$/;

/**
 * Validates password
 * Password must contain at least 8 characters, including at least one upperentity letter, one lowerentity letter, one digit and one special character
 * @param {string} password - the password to validate
 * @returns {boolean}
 */
export function validatePassword(password) {
    return passwordRegex.test(password);
}
