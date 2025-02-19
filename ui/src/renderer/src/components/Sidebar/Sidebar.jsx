import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    Edit,
    LogOut,
    UserCrown,
    Bell,
    BellNotification,
    Settings,
    Notes,
    SunLight,
    HalfMoon,
    HelpCircle,
} from 'iconoir-react';
import { Graph, QuestionMark } from '@phosphor-icons/react';
import SidebarItem from '../SidebarItem/SidebarItem';
import SidebarSection from '../SidebarSection/SidebarSection';
import useAuth from '../../hooks/useAuth/useAuth';
import { HomeAltSlimHoriz } from 'iconoir-react/regular';
import { useNavigate } from 'react-router-dom';

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
    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(isHovered);
    const auth = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);

    useEffect(() => {
        const handleMouseDown = (e) => {
            if (e.button === 0) {
                setIsRightMouseDown(!isHoveredRef.current);
            }
        };

        const handleMouseUp = (e) => {
            if (e.button === 0) {
                setIsRightMouseDown(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const welcomeLocation = '/';
    const handleWelcomePage = useCallback(() => {
        navigate(welcomeLocation);
    }, [navigate]);

    const newNoteLocation = '/editor/new';
    const handleNewNote = useCallback(() => {
        navigate(newNoteLocation);
    }, [navigate]);

    const notesLocation = '/notes';
    const handleNotes = useCallback(() => {
        navigate(notesLocation);
    }, [navigate]);

    const graphViewLocation = '/knowledge-graph';
    const handleGraphView = useCallback(() => {
        navigate(graphViewLocation);
    }, [navigate]);

    const accountSettingsLocation = '/account/me';
    const handleAccountSettings = useCallback(() => {
        navigate(accountSettingsLocation);
    }, [navigate]);

    const adminLocation = '/admin';
    const handleAdminPanel = useCallback(() => {
        navigate(adminLocation);
    }, [navigate]);

    const handleLogout = useCallback(() => {
        auth.logOut();
    }, [auth, navigate, location]);

    let notificationIconColor = showNotifications ? 'text-gray-500' : '';

    return (
        <div className='h-full sticky top-0' data-testid='sidebar-test'>
            <aside
                className={`sidebar !h-full w-14 text-gray-400 transition-all duration-300 overflow-hidden group/sidebar ${
                    !isRightMouseDown ? 'hover:w-48' : ''
                }`}
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
                                handleClick={handleWelcomePage}
                                icon={<HomeAltSlimHoriz />}
                                text='Home'
                                highlightedLocation={welcomeLocation}
                            />
                            <SidebarItem
                                handleClick={handleNewNote}
                                icon={<Edit />}
                                text='New Note'
                                highlightedLocation={newNoteLocation}
                            />
                            <SidebarItem
                                handleClick={handleNotes}
                                icon={<Notes />}
                                text='Notes'
                                highlightedLocation={notesLocation}
                            />
                            <SidebarItem
                                handleClick={handleGraphView}
                                icon={<Graph height={24} width={24} />}
                                text='Graph View'
                                highlightedLocation={graphViewLocation}
                            />

                            <SidebarItem
                                handleClick={handleAccountSettings}
                                icon={<Settings />}
                                text='Settings'
                                highlightedLocation={accountSettingsLocation}
                            />
                        </SidebarSection>
                        {auth.isEntryManager() && (
                            <SidebarSection type='content' height='fit' justify='start'>
                                <SidebarItem
                                    handleClick={handleAdminPanel}
                                    icon={<UserCrown />}
                                    text='Manage'
                                    highlightedLocation={adminLocation}
                                />
                            </SidebarSection>
                        )}
                    </div>
                    <SidebarSection type='footer' height='fit' justify='end'>
                        <SidebarItem
                            handleClick={onThemeToggle}
                            icon={isDarkMode ? <SunLight /> : <HalfMoon />}
                            text={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        />
                        <SidebarItem
                            handleClick={() => navigate('/notes/guide')}
                            icon={<QuestionMark height={24} width={24} />}
                            text='User Guide'
                            highlightedLocation='/notes/how_to_use'
                        />
                        <SidebarItem
                            handleClick={handleNotifications}
                            icon={
                                unreadNotificationsCount > 0 ? (
                                    <BellNotification
                                        className={notificationIconColor}
                                    />
                                ) : (
                                    <Bell className={notificationIconColor} />
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
