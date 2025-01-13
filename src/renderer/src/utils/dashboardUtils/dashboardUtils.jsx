import QueryString from 'qs';
import pluralize from 'pluralize';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import DashboardHorizontalSection from '../../components/DashboardHorizontalSection/DashboardHorizontalSection';

/**
 * Flattens a 3-level link tree into a list of objects.
 * @param {Object} tree The 3-level link tree to flatten.
 * @returns {Object[]} A list of flattened objects, each with at least { type, subtype, name }.
 */
export class LinkTreeFlattener {
    static flatten(tree) {
        const result = [];
        for (const [type, subtypes] of Object.entries(tree)) {
            for (const [subtype, items] of Object.entries(subtypes)) {
                for (const item of items) {
                    if (typeof item === 'string') {
                        result.push({
                            type,
                            subtype,
                            name: item,
                        });
                    } else {
                        result.push({
                            type,
                            subtype,
                            ...item,
                        });
                    }
                }
            }
        }

        return result;
    }
}

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

export const groupSubtypes = (entries, entry_transformer) => {
    let sublistIndices = {};
    let entryCards = [];

    for (let i in entries) {
        const entry = entries[i];
        if (sublistIndices[entry.subtype] === undefined) {
            if (entry.type == 'entity') {
                for (let j in sublistIndices) {
                    sublistIndices[j]++;
                }
                sublistIndices[entry.subtype] = 0;
                entryCards.unshift([]);
            } else {
                sublistIndices[entry.subtype] = entryCards.length;
                entryCards.push([]);
            }
        }

        entryCards[sublistIndices[entry.subtype]].push(entry_transformer(entry));
    }

    return entryCards.filter((l) => l.length !== 0);
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

    return (
        <DashboardHorizontalSection title={relatedEntriesTitle}>
            {groupSubtypes(entries, (e) => (
                <DashboardCard
                    key={`${e.subtype}:${e.name}`}
                    subtype={e.subtype}
                    name={e.name}
                    link={createDashboardLink(e)}
                />
            )).map((l) => (
                <DashboardHorizontalSection
                    title={l[0].props.subtype}
                    key={l[0].props.subtype}
                >
                    {l}
                </DashboardHorizontalSection>
            ))}
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
            {[
                ...groupSubtypes(entries, (e) => (
                    <DashboardCard
                        key={`${e.subtype}:${e.name}`}
                        subtype={e.subtype}
                        name={e.name}
                        link={createDashboardLink(e)}
                    />
                )).map((l) => (
                    <DashboardHorizontalSection
                        title={l[0].props.subtype}
                        key={l[0].props.subtype}
                    >
                        {l}
                    </DashboardHorizontalSection>
                )),
                ...inaccessibleEntriesDiv,
            ]}
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
