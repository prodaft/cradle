/**
 * Generates a redirect URL based on content type and id.
 *
 * @param {string} content_type - The type of the content (e.g., "note", "user", "log").
 * @param {string} id - The unique identifier for the content.
 * @returns {string} - The URL to redirect to based on the content type and id.
 */
export function getRedirectUrl(content_type, id) {
    switch (content_type) {
        case 'note':
            return `/notes/${id}`;
        case 'cradleuser':
            return `/admin/user-permissions/user/${id}`;
        case 'entry':
            return `/admin/edit-entity/${id}`;
        case 'entryclass':
            return `/admin/edit-entry-class/${id}`;
        default:
            return null;
    }
}

/**
 * Mimics Python's strip() function for strings.
 * Removes leading and trailing characters specified in the chars parameter.
 * If no chars parameter is provided, it removes whitespace by default.
 * 
 * @param {string} str - The string to strip
 * @param {string} [chars=' \t\n\r\f\v'] - Characters to remove (defaults to whitespace)
 * @returns {string} - The stripped string
 */
export function strip(str, chars) {
  // Default to whitespace characters if no chars provided
  chars = chars || ' \t\n\r\f\v';
  
  // Escape special regex characters in the chars string
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // Create a RegExp pattern for the characters to strip
  const pattern = new RegExp(`^[${escapeRegExp(chars)}]+|[${escapeRegExp(chars)}]+$`, 'g');
  
  // Return the string with leading and trailing specified characters removed
  return str.replace(pattern, '');
}
