import React from 'react';
import LayoutManager from '../LayoutManager/LayoutManager';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';

/**
 * MainLayout component - The main layout that includes sidebar and content area
 * This component provides the main structure for authenticated pages
 */
export default function MainLayout() {
    const { profile } = useProfile();
    const { isDarkMode, toggleTheme } = useTheme();

    const handleNotifications = () => {
        // Handle notifications panel toggle
        console.log('Toggle notifications panel');
    };

    return (
        <div className='h-screen w-screen flex flex-col overflow-hidden'>
            {/* Navbar - Top of screen */}
            <Navbar contents={[]} />
            
            {/* Main Content Area - Below navbar */}
            <div className='flex-1 flex overflow-hidden'>
                {/* Sidebar */}
                <Sidebar
                    showNotifications={false}
                    unreadNotificationsCount={0}
                    handleNotifications={handleNotifications}
                    isDarkMode={isDarkMode}
                    onThemeToggle={toggleTheme}
                />
                
                {/* Content Area */}
                <div className='flex-1 overflow-hidden'>
                    <LayoutManager outletContext={{}} />
                </div>
            </div>
        </div>
    );
}
