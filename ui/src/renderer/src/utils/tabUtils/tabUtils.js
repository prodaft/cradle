/**
 * Common utilities for tab and layout management
 */

/**
 * Checks if a path should be excluded from tabs (e.g., auth pages)
 * @param {string} path - The path to check
 * @returns {boolean} True if path should be excluded from tabs
 */
export const shouldExcludeFromTabs = (path) => {
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
 * @param {string} path - The path to get a title for
 * @returns {string} The title
 */
export const getTitleForPath = (path) => {
    if (path === '/' || path === '') return 'Welcome';
    
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    
    const firstSegment = segments[0];
    
    const specialCases = {
        'documents': 'Documents',
        'files': 'Files',
        'digest-data': 'Digest Data',
        'notes': 'Notes',
        'editor': 'Fleeting Note',
        'dashboards': 'Dashboard',
        'knowledge-graph': 'Knowledge Graph',
        'connectivity': 'Reports',
        'reports': 'Report',
        'publish': 'Publish',
        'activity': 'Activity',
        'account': 'Settings',
        'admin': 'Admin Panel',
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
    
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).replace(/-/g, ' ');
};

/**
 * Gets an icon name for a given path
 * @param {string} path - The path to get an icon for
 * @returns {string} The icon name
 */
export const getIconForPath = (path) => {
    if (path === '/' || path === '') return 'Dashboard';
    
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    
    const firstSegment = segments[0];
    
    const iconMap = {
        'documents': 'PageFlip',
        'files': 'Folder',
        'digest-data': 'DatabaseBackup',
        'notes': 'Notes',
        'editor': 'EditPencil',
        'dashboards': 'Dashboard',
        'knowledge-graph': 'NetworkAlt',
        'connectivity': 'Page',
        'reports': 'Reports',
        'publish': 'CloudUpload',
        'activity': 'Activity',
        'account': 'Settings',
        'admin': 'Shield',
        'not-implemented': 'WarningTriangle',
    };
    
    return iconMap[firstSegment] || 'Page';
};

/**
 * Generates a unique ID for tabs
 * @returns {string} A unique tab ID
 */
export const generateTabId = () => {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generates a unique ID for panes
 * @returns {string} A unique pane ID
 */
export const generatePaneId = () => {
    return `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates tab data structure
 * @param {Object} tab - The tab object to validate
 * @returns {boolean} True if tab is valid
 */
export const validateTab = (tab) => {
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
 * @param {Object} paneState - The pane state to validate
 * @returns {boolean} True if pane state is valid
 */
export const validatePaneState = (paneState) => {
    return (
        paneState &&
        typeof paneState === 'object' &&
        Array.isArray(paneState.tabs) &&
        typeof paneState.activeTabIndex === 'number' &&
        paneState.activeTabIndex >= 0 &&
        (paneState.tabs.length === 0 || paneState.activeTabIndex < paneState.tabs.length)
    );
};

/**
 * Creates a new tab object
 * @param {string} path - The path for the tab
 * @returns {Object} A new tab object
 */
export const createTab = (path) => {
    return {
        id: generateTabId(),
        path,
        title: getTitleForPath(path),
        icon: getIconForPath(path),
    };
};

/**
 * Creates a new pane state
 * @param {string} initialPath - The initial path for the pane
 * @returns {Object} A new pane state
 */
export const createPaneState = (initialPath = '/') => {
    return {
        tabs: [createTab(initialPath)],
        activeTabIndex: 0,
    };
};
