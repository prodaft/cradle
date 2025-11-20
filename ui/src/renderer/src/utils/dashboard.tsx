/**
 * Dashboard utilities for organizing and rendering dashboard content
 */

import { ReactElement } from 'react';
import DashboardCard from '@components/domain/dashboard/DashboardCard';
import DashboardHorizontalSection from '@components/domain/dashboard/DashboardHorizontalSection';

/**
 * Dashboard entry structure
 */
export interface DashboardEntry {
  name: string;
  subtype: string;
  type?: string;
}

/**
 * Subtype hierarchy tree node
 */
interface TreeNode {
  [key: string]: TreeNode;
}

/**
 * Class for building and converting subtype hierarchies
 */
export class SubtypeHierarchy {
  private tree: TreeNode;
  private pathsMap: Record<string, boolean>;

  constructor(paths: string[]) {
    this.tree = {};
    this.pathsMap = {};

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

  /**
   * Convert the hierarchy tree using custom callbacks
   *
   * @param node_callback - Callback for internal nodes
   * @param leaf_callback - Callback for leaf nodes
   * @returns Converted tree structure
   */
  convert<T>(
    node_callback: (value: string, children: T[], childPaths: string[]) => T,
    leaf_callback: (value: string, path: string) => T
  ): T[] {
    const traverse = (value: string, children: TreeNode, path: string): T => {
      if (Object.keys(children).length === 0) {
        // Leaf node
        return leaf_callback(value, path);
      }

      // Internal node
      const childResults: T[] = [];

      // Collect all child paths for this node
      const childPaths = this.collectChildPaths(path + value + '/', children);

      // Sort children by depth before traversing
      const sortedKeys = Object.keys(children).sort(
        (a, b) => this.getDepth(children[a]) - this.getDepth(children[b])
      );

      for (const key of sortedKeys) {
        childResults.push(traverse(key, children[key], path + value + '/'));
      }

      return node_callback(value, childResults, childPaths);
    };

    const sortedKeys = Object.keys(this.tree).sort(
      (a, b) => this.getDepth(this.tree[a]) - this.getDepth(this.tree[b])
    );

    return sortedKeys.map((key) => traverse(key, this.tree[key], ''));
  }

  /**
   * Collect all child paths for a given node
   */
  private collectChildPaths(currentPath: string, node: TreeNode): string[] {
    const paths: string[] = [];

    const collectPaths = (nodePath: string, subNode: TreeNode): void => {
      // Check if this is a valid path in our original data
      if (this.pathsMap[nodePath.slice(0, -1)]) {
        paths.push(nodePath.slice(0, -1)); // Remove trailing slash
      }

      // Process children
      for (const key of Object.keys(subNode)) {
        collectPaths(nodePath + key + '/', subNode[key]);
      }
    };

    collectPaths(currentPath, node);
    return paths;
  }

  /**
   * Calculate depth of a subtree
   */
  private getDepth(node: TreeNode): number {
    if (Object.keys(node).length === 0) {
      return 0; // Leaf node
    }
    return 1 + Math.max(...Object.values(node).map((child) => this.getDepth(child)));
  }
}

/**
 * Link tree item structure
 */
interface LinkTreeItem {
  type: string;
  subtype: string;
  name: string;
  [key: string]: any;
}

/**
 * 3-level link tree structure
 */
type LinkTree = Record<string, Record<string, (string | Record<string, any>)[]>>;

/**
 * Utility class for flattening 3-level link trees
 */
export class LinkTreeFlattener {
  /**
   * Flattens a 3-level link tree into a list of objects
   *
   * @param tree - The 3-level link tree to flatten
   * @returns A list of flattened objects, each with at least { type, subtype, name }
   */
  static flatten(tree: LinkTree): LinkTreeItem[] {
    const result: LinkTreeItem[] = [];
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
 * Create a dashboard link for an entry
 *
 * @param entry - The entry object
 * @returns The dashboard link
 */
export const createDashboardLink = (entry: DashboardEntry | null): string => {
  if (!entry) {
    return '/not-found';
  }

  const { name, subtype } = entry;

  if (!name || !subtype) {
    return '/not-found';
  }

  return `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`;
};

/**
 * Group entries by subtype with custom transformation
 *
 * @param entries - Array of entries
 * @param entry_transformer - Function to transform each entry
 * @returns Grouped entry cards
 */
export const groupSubtypes = <T,>(
  entries: DashboardEntry[],
  entry_transformer: (entry: DashboardEntry) => T
): T[][] => {
  const sublistIndices: Record<string, number> = {};
  const entryCards: T[][] = [];

  for (const i in entries) {
    const entry = entries[i];
    if (sublistIndices[entry.subtype] === undefined) {
      if (entry.type === 'entity') {
        for (const j in sublistIndices) {
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
 * Render a dashboard section with entries
 *
 * @param entries - The entries to render
 * @param relatedEntriesTitle - The title of the section
 * @returns React element or null
 */
export const renderDashboardSection = (
  entries: DashboardEntry[] | null,
  relatedEntriesTitle: string
): ReactElement | null => {
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
        <DashboardHorizontalSection title={l[0].props.subtype} key={l[0].props.subtype}>
          {l}
        </DashboardHorizontalSection>
      ))}
    </DashboardHorizontalSection>
  );
};

/**
 * Render a dashboard section with entries and inaccessible entries
 *
 * @param entries - Accessible entries
 * @param inaccessibleEntries - Inaccessible entries
 * @param relatedEntriesTitle - Title of the section
 * @param inaccessibleEntriesMessage - Message for inaccessible entries
 * @param requestAccessMessage - Message for request access link
 * @param handleRequestEntryAccess - Handler for requesting access
 * @returns React element or null
 */
export const renderDashboardSectionWithInaccessibleEntries = (
  entries: DashboardEntry[] | null,
  inaccessibleEntries: DashboardEntry[] | null,
  relatedEntriesTitle: string,
  inaccessibleEntriesMessage: string,
  requestAccessMessage: string,
  handleRequestEntryAccess: (entries: DashboardEntry[]) => void
): ReactElement | null => {
  if (!entries) {
    return null;
  }

  const inaccessibleEntriesDiv =
    inaccessibleEntries && inaccessibleEntries.length > 0
      ? [
          <div
            key="inaccessible-entries"
            className="w-full h-fit mt-1 flex flex-row justify-between items-center text-zinc-400"
          >
            <p>
              {inaccessibleEntriesMessage}
              <span
                className="underline cursor-pointer"
                onClick={() => handleRequestEntryAccess(inaccessibleEntries)}
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
          <DashboardHorizontalSection title={l[0].props.subtype} key={l[0].props.subtype}>
            {l}
          </DashboardHorizontalSection>
        )),
        ...inaccessibleEntriesDiv,
      ]}
    </DashboardHorizontalSection>
  );
};

/**
 * Truncate text to a specific length
 *
 * @param text - The text to truncate
 * @param maxLength - The maximum length of the truncated text (not including '...')
 * @param defaultText - Default text if input is empty
 * @returns The truncated text
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number,
  defaultText: string = '-'
): string => {
  if (!text) {
    return defaultText;
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + '...';
};

/**
 * Capitalize a string (underscore-separated to title case)
 *
 * @param input - Input string with underscores
 * @returns Capitalized string
 */
export function capitalizeString(input: string): string {
  const words = input.split('_');

  const formattedWords = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  return formattedWords.join(' ');
}

/**
 * Natural sort comparison function for strings with numbers
 *
 * @param a - First string
 * @param b - Second string
 * @returns Comparison result
 */
export function naturalSort(a: string, b: string): number {
  // Regular expression to split strings into parts
  const regex = /([^0-9]+)([0-9]+)/;

  // Helper to split a string into text/number parts
  const getParts = (str: string): (string | number)[] => {
    const parts: (string | number)[] = [];
    let remainder = str;
    let match: RegExpExecArray | null;

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
        return (aParts[i] as number) - (bParts[i] as number);
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
