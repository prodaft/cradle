/**
 * Common utilities for tab and layout management
 */

/**
 * Tab object structure
 */
export interface TabObject {
    id: string;
    path: string;
    title: string;
    icon: string;
}

/**
 * Pane state structure
 */
export interface PaneState {
    tabs: TabObject[];
    activeTabIndex: number;
}

/**
 * Checks if a path should be excluded from tabs (e.g., auth pages)
 *
 * @param path - The path to check
 * @returns True if path should be excluded from tabs
 */
export const shouldExcludeFromTabs = (path: string): boolean => {
    const excludedPaths = [
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/confirm-email',
    ];
    return excludedPaths.includes(path);
};

/**
 * Gets a user-friendly title for a given path
 *
 * @param path - The path to get a title for
 * @returns The title
 */
export const getTitleForPath = (path: string): string => {
    if (path === '/' || path === '') return 'Welcome';

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const firstSegment = segments[0];

    const specialCases: Record<string, string> = {
        documents: 'Documents',
        files: 'Files',
        'digest-data': 'Digest Data',
        notes: 'Notes',
        editor: 'Fleeting Note',
        dashboards: 'Dashboard',
        'knowledge-graph': 'Knowledge Graph',
        reports: 'Reports',
        publish: 'Publish',
        activity: 'Activity',
        settings: 'Settings',
        manage: 'Manage',
        'not-implemented': 'Not Implemented',
    };

    if (specialCases[firstSegment]) {
        if (firstSegment === 'notes' && segments.length > 1) {
            return '...';
        }
        if (segments.length > 1 && segments[1] !== 'edit') {
            const id = segments[1];
            const shortId = id.length > 8 ? id.substring(0, 8) + '...' : id;
            return `${specialCases[firstSegment]}: ${shortId}`;
        }
        return specialCases[firstSegment];
    }

    return (
        firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).replace(/-/g, ' ')
    );
};

/**
 * Gets an icon name for a given path
 *
 * @param path - The path to get an icon for
 * @returns The icon name
 */
export const getIconForPath = (path: string): string => {
    if (path === '/' || path === '') return 'Dashboard';

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const firstSegment = segments[0];

    const iconMap: Record<string, string> = {
        documents: 'PageFlip',
        files: 'Folder',
        'digest-data': 'DatabaseBackup',
        notes: 'Notes',
        editor: 'EditPencil',
        dashboards: 'Dashboard',
        'knowledge-graph': 'NetworkAlt',
        reports: 'Page',
        publish: 'CloudUpload',
        activity: 'Activity',
        settings: 'Settings',
        manage: 'Shield',
        'not-implemented': 'WarningTriangle',
    };

    return iconMap[firstSegment] || 'Page';
};

/**
 * Generates a unique ID for tabs
 *
 * @returns A unique tab ID
 */
export const generateTabId = (): string => {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generates a unique ID for panes
 *
 * @returns A unique pane ID
 */
export const generatePaneId = (): string => {
    return `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates tab data structure
 *
 * @param tab - The tab object to validate
 * @returns True if tab is valid
 */
export const validateTab = (tab: any): tab is TabObject => {
    return (
        tab &&
        typeof tab === 'object' &&
        typeof tab.id === 'string' &&
        typeof tab.path === 'string' &&
        typeof tab.title === 'string' &&
        typeof tab.icon === 'string'
    );
};

/**
 * Validates pane state structure
 *
 * @param paneState - The pane state to validate
 * @returns True if pane state is valid
 */
export const validatePaneState = (paneState: any): paneState is PaneState => {
    return (
        paneState &&
        typeof paneState === 'object' &&
        Array.isArray(paneState.tabs) &&
        typeof paneState.activeTabIndex === 'number' &&
        paneState.activeTabIndex >= 0 &&
        (paneState.tabs.length === 0 ||
            paneState.activeTabIndex < paneState.tabs.length)
    );
};

/**
 * Creates a new tab object
 *
 * @param path - The path for the tab
 * @returns A new tab object
 */
export const createTab = (path: string): TabObject => {
    return {
        id: generateTabId(),
        path,
        title: getTitleForPath(path),
        icon: getIconForPath(path),
    };
};

/**
 * Creates a new pane state
 *
 * @param initialPath - The initial path for the pane
 * @returns A new pane state
 */
export const createPaneState = (initialPath: string = '/'): PaneState => {
    return {
        tabs: [createTab(initialPath)],
        activeTabIndex: 0,
    };
};
