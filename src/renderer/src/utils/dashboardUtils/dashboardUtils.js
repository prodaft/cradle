import QueryString from "qs";
import pluralize from "pluralize";

/**
 * Function to create a dashboard link for an entity
 * 
 * @param entity - the entity object
 * @returns {string} - the dashboard link
 */
const createDashboardLink = (entity) => {
    if (!entity) return "";
    const name = encodeURIComponent(entity.name) || ""; // avoid undefined links
    const type = encodeURIComponent(entity.type);
    const subtype = entity.subtype;

    if (subtype) {
        const queryString = QueryString.stringify({ subtype: subtype });
        return `/dashboards/${pluralize(type)}/${name}?${queryString}`;
    }

    return `/dashboards/${pluralize(type)}/${name}/`;
}

export { createDashboardLink }
