import { useProfile } from '@contexts';
import { useAuth, useCradleNavigate } from '@hooks';
import { Graph } from '@phosphor-icons/react';
import {
    Archive,
    DatabaseBackup,
    Notes,
    Page,
    Settings,
    Sparks,
    UserCrown,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import SidebarItem from './SidebarItem';
import SidebarSection from './SidebarSection';

/**
 * Sidebar component props
 */
export interface SidebarProps {
    /** Whether dark mode is currently enabled */
    isDarkMode: boolean;
    /** Handler for toggling theme */
    onThemeToggle: () => void;
}

/**
 * Sidebar component - the main sidebar for the application
 *
 * Provides navigation to all major sections of the application.
 *
 * @example
 * ```tsx
 * <Sidebar
 *   showNotifications={false}
 *   unreadNotificationsCount={3}
 *   handleNotifications={toggleNotifications}
 *   isDarkMode={theme === 'dark'}
 *   onThemeToggle={toggleTheme}
 * />
 * ```
 */
export default function Sidebar({
    isDarkMode,
    onThemeToggle,
}: SidebarProps): JSX.Element {
    const [isRightMouseDown, setIsRightMouseDown] = useState(false);
    const { isEntryManager, profile } = useProfile();
    const { navigate, navigateLink } = useCradleNavigate();

    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(isHovered);

    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);

    const documentsLocation = '/notes';
    const handleDocuments = useCallback(navigateLink(documentsLocation), [
        navigateLink,
    ]);

    const filesLocation = '/files';
    const handleFiles = useCallback(navigateLink(filesLocation), [navigateLink]);

    const digestDataLocation = '/digest-data';
    const handleDigestData = useCallback(navigateLink(digestDataLocation), [
        navigateLink,
    ]);

    const enrichmentRequestsLocation = '/enrich';
    const handleEnrichmentRequests = useCallback(
        navigateLink(enrichmentRequestsLocation),
        [navigateLink],
    );

    const graphViewLocation = '/knowledge-graph';
    const handleGraphView = useCallback(navigateLink(graphViewLocation), [
        navigateLink,
    ]);

    const connectivityLocation = '/reports';
    const handleConnectivity = useCallback(navigateLink(connectivityLocation), [
        navigateLink,
    ]);

    const accountSettingsLocation = '/settings';
    const handleAccountSettings = useCallback(navigateLink(accountSettingsLocation), [
        navigateLink,
    ]);

    const adminLocation = '/manage';
    const handleAdminPanel = useCallback(navigateLink(adminLocation), [navigateLink]);

    return (
        <div className='h-full shrink-0' data-testid='sidebar-test'>
            <aside
                className={`cradle-border-r !h-full w-14 overflow-visible group/sidebar`}
                style={{
                    backgroundColor: 'var(--cradle-bg-sidebar)',
                    color: 'var(--cradle-sidebar-text)',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className='flex flex-col h-full justify-between'>
                    <div className='flex flex-col gap-0'>
                        <SidebarSection
                            sectionType='header'
                            height='fit'
                            justify='start'
                        >
                            <SidebarItem
                                handleClick={handleDocuments}
                                icon={<Notes />}
                                text='Notes'
                                highlightedLocation={documentsLocation}
                            />
                            <SidebarItem
                                handleClick={handleFiles}
                                icon={<Archive />}
                                text='Files'
                                highlightedLocation={filesLocation}
                            />
                            <SidebarItem
                                handleClick={handleDigestData}
                                icon={<DatabaseBackup />}
                                text='Digest Data'
                                highlightedLocation={digestDataLocation}
                            />
                            <SidebarItem
                                handleClick={handleConnectivity}
                                icon={<Page />}
                                text='Reports'
                                highlightedLocation={connectivityLocation}
                            />
                            <SidebarItem
                                handleClick={handleEnrichmentRequests}
                                icon={<Sparks />}
                                text='Enrichment'
                                highlightedLocation={enrichmentRequestsLocation}
                            />
                            <SidebarItem
                                handleClick={handleGraphView}
                                icon={<Graph height={24} width={24} />}
                                text='Graph Explorer'
                                highlightedLocation={graphViewLocation}
                            />
                        </SidebarSection>
                    </div>
                    <SidebarSection sectionType='footer' height='fit' justify='end'>
                        {isEntryManager() && (
                            <SidebarItem
                                handleClick={handleAdminPanel}
                                icon={<UserCrown height={24} width={24} />}
                                text='Manage'
                                highlightedLocation={adminLocation}
                            />
                        )}
                        <SidebarItem
                            handleClick={handleAccountSettings}
                            icon={<Settings height={24} width={24} />}
                            text='Settings'
                            highlightedLocation={accountSettingsLocation}
                        />
                    </SidebarSection>
                </div>
            </aside>
        </div>
    );
}
