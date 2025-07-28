import DashboardCard from '../../components/DashboardCard/DashboardCard';
import DashboardHorizontalSection from '../../components/DashboardHorizontalSection/DashboardHorizontalSection';

export class SubtypeHierarchy {
    constructor(paths) {
        this.tree = {};
        this.pathsMap = {}; // Store all full paths for reference

        for (let path of paths) {
            // Store the original full path
            this.pathsMap[path] = true;

            path.split('/').reduce((acc, cur) => {
                if (!acc[cur]) {
                    acc[cur] = {};
                }
                return acc[cur];
            }, this.tree);
        }
    }

    convert(node_callback, leaf_callback) {
        const traverse = (value, children, path) => {
            if (Object.keys(children).length === 0) {
                // Leaf node
                return leaf_callback(value, path);
            }

            // Internal node
            const childResults = [];

            // Collect all child paths for this node
            const childPaths = this.collectChildPaths(path + value + '/', children);

            // Sort children by depth before traversing
            const sortedKeys = Object.keys(children).sort(
                (a, b) => this.getDepth(children[a]) - this.getDepth(children[b]),
            );

            for (const key of sortedKeys) {
                childResults.push(traverse(key, children[key], path + value + '/'));
            }

            return node_callback(value, childResults, childPaths);
        };

        const sortedKeys = Object.keys(this.tree).sort(
            (a, b) => this.getDepth(this.tree[a]) - this.getDepth(this.tree[b]),
        );

        return sortedKeys.map((key) => traverse(key, this.tree[key], ''));
    }

    // Helper method to collect all child paths for a given node
    collectChildPaths(currentPath, node) {
        const paths = [];

        // Helper function to recursively collect paths
        const collectPaths = (nodePath, subNode) => {
            // Check if this is a valid path in our original data
            if (this.pathsMap[nodePath.slice(0, -1)]) {
                // Remove trailing slash
                paths.push(nodePath.slice(0, -1)); // Remove trailing slash for consistency
            }

            // Process children
            for (const key of Object.keys(subNode)) {
                collectPaths(nodePath + key + '/', subNode[key]);
            }
        };

        collectPaths(currentPath, node);
        return paths;
    }

    // Helper to calculate depth of a subtree
    getDepth(node) {
        if (Object.keys(node).length === 0) {
            return 0; // Leaf node
        }
        return (
            1 + Math.max(...Object.values(node).map((child) => this.getDepth(child)))
        );
    }
}

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

    const { name, subtype } = entry;

    if (!name || !subtype) {
        return '/not-found';
    }

    return `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`;
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
export const truncateText = (text, maxLength, defaultText = '-') => {
    if (!text) {
        return defaultText;
    }

    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength) + '...';
};

export function capitalizeString(input) {
    const words = input.split('_');

    const formattedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    );

    return formattedWords.join(' ');
}

export function naturalSort(a, b) {
    // Regular expression to split strings into parts
    const regex = /([^0-9]+)([0-9]+)/;

    // Helper to split a string into text/number parts
    const getParts = (str) => {
        const parts = [];
        let remainder = str;
        let match;

        while ((match = regex.exec(remainder)) !== null) {
            // Add the text part
            parts.push(match[1]);
            // Add the number part (converted to a number for numeric comparison)
            parts.push(parseInt(match[2], 10));
            remainder = remainder.substring(match[0].length);
        }

        // Add any remaining text
        if (remainder) parts.push(remainder);
        return parts;
    };

    const aParts = getParts(a);
    const bParts = getParts(b);

    // Compare each part
    const minLength = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < minLength; i++) {
        // If both parts are numbers, compare numerically
        if (typeof aParts[i] === 'number' && typeof bParts[i] === 'number') {
            if (aParts[i] !== bParts[i]) {
                return aParts[i] - bParts[i];
            }
        }
        // Otherwise compare as strings
        else if (aParts[i] !== bParts[i]) {
            return aParts[i].toString().localeCompare(bParts[i].toString());
        }
    }

    // If all comparable parts are equal, the shorter string comes first
    return aParts.length - bParts.length;
}
