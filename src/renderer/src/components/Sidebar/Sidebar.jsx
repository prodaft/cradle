import React from 'react';
import { Edit, Network, LogOut, UserCrown } from 'iconoir-react';
import SidebarItem from '../SidebarItem/SidebarItem';
import SidebarSection from '../SidebarSection/SidebarSection';
import { useAuth } from '../../hooks/useAuth/useAuth';
import Logo from '../Logo/Logo';
import { useNavigate } from 'react-router-dom';

/**
 * Sidebar component - the main sidebar for the application.
 *
 * @param handleLogout - handler for the logout action
 * @param handleNewNote - handler for the new note action
 * @param handleGraphView - handler for the graph view action
 * @param handleAdminPanel - handler for the admin panel action
 * @returns {Sidebar}
 * @constructor
 */
export default function Sidebar({
    handleAdminPanel,
    handleGraphView,
    handleLogout,
    handleNewNote,
}) {
    const auth = useAuth();
    const navigate = useNavigate();
    return (
        <div className='h-full sticky top-0' data-testid='sidebar-test'>
            <aside className='sidebar !h-full text-gray-400 w-16 hover:w-48 transition-all duration-300 overflow-hidden group/sidebar'>
                <div className='flex flex-col h-full justify-between'>
                    <div className='flex flex-col'>
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
                        <SidebarSection type='content' height='fit' justify='start'>
                            {auth.isAdmin && (
                                <SidebarItem
                                    handleClick={handleAdminPanel}
                                    icon={<UserCrown />}
                                    text='Admin'
                                />
                            )}
                        </SidebarSection>
                    </div>
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
