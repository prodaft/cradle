import React, { useCallback } from 'react';
import {
    Edit,
    Network,
    LogOut,
    UserCrown,
    Bell,
    BellNotification,
} from 'iconoir-react';
import SidebarItem from '../SidebarItem/SidebarItem';
import SidebarSection from '../SidebarSection/SidebarSection';
import { useAuth } from '../../hooks/useAuth/useAuth';
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
 * @returns {Sidebar}
 * @constructor
 */
export default function Sidebar({
    showNotifications,
    unreadNotificationsCount,
    handleNotifications,
}) {
    const auth = useAuth();
    const navigate = useNavigate();

    const welcomeLocation = '/';
    const handleWelcomePage = useCallback(() => {
        navigate(welcomeLocation);
    }, [navigate]);

    const newNoteLocation = '/editor';
    const handleNewNote = useCallback(() => {
        navigate(newNoteLocation);
    }, [navigate]);

    const graphViewLocation = '/knowledge-graph';
    const handleGraphView = useCallback(() => {
        navigate(graphViewLocation);
    }, [navigate]);

    const adminLocation = '/admin';
    const handleAdminPanel = useCallback(() => {
        navigate(adminLocation);
    }, [navigate]);

    const handleLogout = useCallback(() => {
        auth.logOut();
        localStorage.clear(); // TODO save unsaved notes as fleeting notes
        navigate('/login', {
            state: { from: location, state: location.state },
        });
    }, [auth, navigate, location]);

    let notificationIconColor = showNotifications ? 'text-gray-500' : '';

    return (
        <div className='h-full sticky top-0' data-testid='sidebar-test'>
            <aside className='sidebar !h-full text-gray-400 w-14 hover:w-48 transition-all duration-300 overflow-hidden group/sidebar'>
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
                                handleClick={handleGraphView}
                                icon={<Network />}
                                text='Graph View'
                                highlightedLocation={graphViewLocation}
                            />
                        </SidebarSection>
                        {auth.isAdmin && (
                            <SidebarSection type='content' height='fit' justify='start'>
                                <SidebarItem
                                    handleClick={handleAdminPanel}
                                    icon={<UserCrown />}
                                    text='Admin'
                                    highlightedLocation={adminLocation}
                                />
                            </SidebarSection>
                        )}
                    </div>
                    <SidebarSection type='footer' height='fit' justify='end'>
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
