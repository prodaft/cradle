import QueryString from 'qs';
import pluralize from 'pluralize';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import DashboardHorizontalSection from '../../components/DashboardHorizontalSection/DashboardHorizontalSection';

/**
 * Function to create a dashboard link for an entry.
 * It does not assert the correctness of the entry object.
 * Any invalid link will send the user to the '404 Not Found' Page.
 *
 * @function createDashboardLink
 * @param {?DashboardEntry} entry - the entry object
 * @returns {string} - the dashboard link
 */
export const createDashboardLink = (entry) => {
    if (!entry) {
        return '/not-found';
    }

    const { name, type, subtype } = entry;

    if (!name || !type) {
        return '/not-found';
    }

    if (subtype) {
        const queryString = QueryString.stringify({ subtype: subtype }); // qs also encodes the values
        return `/dashboards/${encodeURIComponent(pluralize(type))}/${encodeURIComponent(name)}/?${queryString}`;
    }

    return `/dashboards/${encodeURIComponent(pluralize(type))}/${encodeURIComponent(name)}/`;
};

/**
 * Function to render a dashboard section with entries.
 * It creates a DashboardCard for each entry and wraps them in a DashboardHorizontalSection.
 *
 * @function renderDashboardSection
 * @param {?Array<DashboardEntry>} entries - the entries to render
 * @param {string} relatedEntriesTitle - the title of the section
 * @returns {?React.ReactElement}
 */
export const renderDashboardSection = (entries, relatedEntriesTitle) => {
    if (!entries) {
        return null;
    }

    const entryCards = entries.map((artifact, index) => (
        <DashboardCard
            key={index}
            name={artifact.subtype ? `${artifact.subtype}: ${artifact.name}` : artifact.name}
            link={createDashboardLink(artifact)}
        />
    ));

    return (
        <DashboardHorizontalSection title={relatedEntriesTitle}>
            {entryCards}
        </DashboardHorizontalSection>
    );
};

/**
 * Function to render a dashboard section with entries and inaccessible entries.
 * It creates a DashboardCard for each entry and wraps them in a DashboardHorizontalSection.
 * If there are inaccessible entries, a message is displayed with a button to request access.
 *
 * @function renderDashboardSectionWithInaccessibleEntries
 * @param {?Array<DashboardEntry>} entries
 * @param {?Array<DashboardEntry>} inaccessibleEntries
 * @param {string} relatedEntriesTitle
 * @param {string} inaccessibleEntriesMessage
 * @param {string} requestAccessMessage
 * @param {function} handleRequestEntryAccess
 * @returns {?React.ReactElement}
 */
export const renderDashboardSectionWithInaccessibleEntries = (
    entries,
    inaccessibleEntries,
    relatedEntriesTitle,
    inaccessibleEntriesMessage,
    requestAccessMessage,
    handleRequestEntryAccess,
) => {
    if (!entries) {
        return null;
    }

    const entryCards = entries.map((entry, index) => (
        <DashboardCard
            key={index}
            name={entry.name}
            link={createDashboardLink(entry)}
        />
    ));

    const inaccessibleEntriesDiv =
        inaccessibleEntries && inaccessibleEntries.length > 0
            ? [
                  <div
                      key='inaccessible-entries'
                      className='w-full h-fit mt-1 flex flex-row justify-between items-center text-zinc-400'
                  >
                      <p>
                          {inaccessibleEntriesMessage}
                          <span
                              className='underline cursor-pointer'
                              onClick={() =>
                                  handleRequestEntryAccess(inaccessibleEntries)
                              }
                          >
                              {requestAccessMessage}
                          </span>
                      </p>
                  </div>,
              ]
            : [];

    return (
        <DashboardHorizontalSection title={relatedEntriesTitle}>
            {[...entryCards, ...inaccessibleEntriesDiv]}
        </DashboardHorizontalSection>
    );
};

/**
 * Function to truncate text to a specific length.
 * If the text is shorter than the specified length, it is returned as is.
 * Otherwise, the text is truncated and '...' is appended to it.
 *
 * @param {string} text - the text to truncate
 * @param {number} maxLength - the maximum length of the truncated text (not including '...')
 * @returns {string} - the truncated text
 */
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength) + '...';
};
