import React from 'react';
import { Edit, Network, LogOut} from 'iconoir-react';
import SidebarItem from "../SidebarItem/SidebarItem";
import SidebarSection from "../SidebarSection/SidebarSection";

/**
 * Sidebar component - the main sidebar for the application.
 * @param props
 * @param props.handleLogout - handler for the logout action
 * @param props.handleNewNote - handler for the new note action
 * @param props.handleGrapView - handler for the graph view action
 *
 * @returns {JSX.Element}
 * @constructor
 */
export default function Sidebar(props) {
    return (
        <div className="w-fit h-screen sticky top-0">
                <aside className="sidebar justify-start w-fit group/sidebar" data-testid="sidebar-test">
                    <SidebarSection sectionType='header' height='fit' justify='start'>
                        <SidebarItem handleClick={props.handleNewNote} icon={<Edit />} text="New Note" />
                        <SidebarItem handleClick={props.handleGraphView} icon={<Network />} text="Graph View" />
                    </SidebarSection>
                    <SidebarSection type="content" height='full' justify='start'>

                    </SidebarSection>
                    <SidebarSection type="footer" height='fit' justify='end'>
                        <SidebarItem handleClick={props.handleLogout} icon={<LogOut/>} text="Logout"/>
                    </SidebarSection>
                </aside>
        </div>

        
        
    );
};