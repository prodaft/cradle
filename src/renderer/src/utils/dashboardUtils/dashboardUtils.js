import QueryString from 'qs';
import pluralize from 'pluralize';

/**
 * Function to create a dashboard link for an entity.
 * It does not assert the correctness of the entity object.
 * Any invalid link will send the user to the '404 Not Found' Page.
 *
 * @param entity - the entity object
 * @returns {string} - the dashboard link
 */
const createDashboardLink = (entity) => {
    if (!entity) {
        return '/not-found';
    }

    const { name, type, subtype } = entity;

    if (!name || !type) {
        return '/not-found';
    }

    if (subtype) {
        const queryString = QueryString.stringify({ subtype: subtype }); // qs also encodes the values
        return `/dashboards/${encodeURIComponent(pluralize(type))}/${encodeURIComponent(name)}?${queryString}`;
    }

    return `/dashboards/${encodeURIComponent(pluralize(type))}/${encodeURIComponent(name)}/`;
};

export { createDashboardLink };
