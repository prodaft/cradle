import { Graph } from '@phosphor-icons/react';
import {
    Archive,
    Bell,
    BellNotification,
    DatabaseBackup,
    LogOut,
    Notes,
    Page,
    Settings,
    UserCrown,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useAuth from '../../hooks/useAuth/useAuth';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import SidebarItem from '../SidebarItem/SidebarItem';
import SidebarSection from '../SidebarSection/SidebarSection';

/**
 * Sidebar component - the main sidebar for the application.
 *
 * @function Sidebar
 * @param {Object} props - the props object
 * @param {boolean} props.showNotifications - determines if the notifications panel should be displayed
 * @param {number} props.unreadNotificationsNumber - the number of new notifications
 * @param {Function} props.handleNotifications - handler for the notifications action
 * @param {Function} props.handleWelcomePage - handler for navigating to the welcome page
 * @param {boolean} props.isDarkMode - determines if the current mode is dark mode
 * @param {Function} props.onThemeToggle - handler for toggling between light and dark mode
 * @returns {Sidebar}
 * @constructor
 */
export default function Sidebar({
    showNotifications,
    unreadNotificationsCount,
    handleNotifications,
    isDarkMode,
    onThemeToggle,
}) {
    const [isRightMouseDown, setIsRightMouseDown] = useState(false);
    const auth = useAuth();
    const { isEntryManager, profile } = useProfile();
    const { navigate, navigateLink } = useCradleNavigate();

    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(isHovered);

    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);


    const documentsLocation = '/documents';
    const handleDocuments = useCallback(navigateLink(documentsLocation), [
        navigateLink,
    ]);

    const filesLocation = '/files';
    const handleFiles = useCallback(navigateLink(filesLocation), [navigateLink]);

    const digestDataLocation = '/digest-data';
    const handleDigestData = useCallback(navigateLink(digestDataLocation), [navigateLink]);

    const graphViewLocation = '/knowledge-graph';
    const handleGraphView = useCallback(navigateLink(graphViewLocation), [
        navigateLink,
    ]);

    const connectivityLocation = '/connectivity';
    const handleConnectivity = useCallback(navigateLink(connectivityLocation), [
        navigateLink,
    ]);

    const accountSettingsLocation = '/account';
    const handleAccountSettings = useCallback(navigateLink(accountSettingsLocation), [
        navigateLink,
    ]);

    const adminLocation = '/admin';
    const handleAdminPanel = useCallback(navigateLink(adminLocation), [navigateLink]);

    const handleLogout = useCallback(() => {
        auth.logOut();
    }, [auth, navigate, location]);

    const notificationIconStyle = showNotifications 
        ? { color: '#FF8C00' } 
        : { color: 'var(--cradle-sidebar-icon)' };

    return (
        <div className='h-full sticky top-0' data-testid='sidebar-test'>
            <aside
                className={`cradle-border-r !h-full w-14 overflow-visible group/sidebar`}
                style={{ 
                    backgroundColor: 'var(--cradle-bg-sidebar)', 
                    color: 'var(--cradle-sidebar-text)' 
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className='flex flex-col h-full justify-between'>
                    <div className='flex flex-col gap-2'>
                        <SidebarSection
                            sectionType='header'
                            height='fit'
                            justify='start'
                        >
                            <SidebarItem
                                handleClick={handleDocuments}
                                icon={<Notes />}
                                text='Documents'
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
                                handleClick={handleGraphView}
                                icon={<Graph height={24} width={24} />}
                                text='Graph Explorer'
                                highlightedLocation={graphViewLocation}
                            />
                            <SidebarItem
                                handleClick={handleConnectivity}
                                icon={<Page />}
                                text='Reports'
                                highlightedLocation={connectivityLocation}
                            />
                        </SidebarSection>
                    </div>
                    <SidebarSection type='footer' height='fit' justify='end'>
                        <SidebarItem
                            handleClick={handleAccountSettings}
                            icon={<Settings />}
                            text='Settings'
                            highlightedLocation={accountSettingsLocation}
                        />
                        {isEntryManager() && (
                            <SidebarSection type='content' height='fit' justify='start'>
                                <SidebarItem
                                    handleClick={handleAdminPanel}
                                    icon={<UserCrown />}
                                    text='Manage'
                                    highlightedLocation={adminLocation}
                                />
                            </SidebarSection>
                        )}
                        {/*
                        <SidebarItem
                            handleClick={() =>
                                window.open('https://cradle.sh/docs/userguide/')
                            }
                            icon={<QuestionMark height={24} width={24} />}
                            text='User Guide'
                            highlightedLocation='_blank'
                        />
                        */}
                        <SidebarItem
                            handleClick={handleNotifications}
                            icon={
                                unreadNotificationsCount > 0 ? (
                                    <BellNotification
                                        style={notificationIconStyle}
                                    />
                                ) : (
                                    <Bell style={notificationIconStyle} />
                                )
                            }
                            text={`${unreadNotificationsCount} Notifications`}
                        />
                        <SidebarItem
                            handleClick={handleLogout}
                            icon={<LogOut />}
                            text='Logout'
                        />
                    </SidebarSection>
                </div>
            </aside>
        </div>
    );
}
