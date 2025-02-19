/**
 * Generates a redirect URL based on content type and id.
 *
 * @param {string} content_type - The type of the content (e.g., "note", "user", "log").
 * @param {string} id - The unique identifier for the content.
 * @returns {string} - The URL to redirect to based on the content type and id.
 */
function getRedirectUrl(content_type, id) {
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

export default getRedirectUrl;
