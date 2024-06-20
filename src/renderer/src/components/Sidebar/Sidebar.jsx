import React from 'react';
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

/**
 * Sidebar component - the main sidebar for the application.
 *
 * @param handleLogout - handler for the logout action
 * @param handleNewNote - handler for the new note action
 * @param handleGraphView - handler for the graph view action
 * @param handleAdminPanel - handler for the admin panel action
 * @param newNotificationsNumber - the number of new notifications
 * @param handleNotifications - handler for the notifications action
 * @returns {Sidebar}
 * @constructor
 */
export default function Sidebar({
    handleAdminPanel,
    handleGraphView,
    handleLogout,
    handleNewNote,
    unreadNotificationsCount,
    handleNotifications,
}) {
    const auth = useAuth();
    return (
        <div className='h-screen sticky top-0' data-testid='sidebar-test'>
            <aside className='sidebar text-gray-400 w-16 hover:w-48 transition-all duration-300 overflow-hidden group/sidebar shadow-2xl'>
                <div className='flex flex-col h-full'>
                    <SidebarSection sectionType='header' height='fit' justify='start'>
                        <SidebarItem
                            handleClick={handleNewNote}
                            icon={<Edit />}
                            text='New Note'
                        />
                        <SidebarItem
                            handleClick={handleGraphView}
                            icon={<Network />}
                            text='Graph View'
                        />
                    </SidebarSection>
                    <SidebarSection type='content' height='full' justify='start'>
                        {auth.isAdmin && (
                            <SidebarItem
                                handleClick={handleAdminPanel}
                                icon={<UserCrown />}
                                text='Admin'
                            />
                        )}
                        {unreadNotificationsCount > 0 ? (
                            <SidebarItem
                                handleClick={handleNotifications}
                                icon={<BellNotification />}
                                text={`${unreadNotificationsCount} Notifications`}
                            />
                        ) : (
                            <SidebarItem
                                handleClick={handleNotifications}
                                icon={<Bell />}
                                text={`${unreadNotificationsCount} Notifications`}
                            />
                        )}
                    </SidebarSection>
                    <SidebarSection type='footer' height='fit' justify='end'>
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
