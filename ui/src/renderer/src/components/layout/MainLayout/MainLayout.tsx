import { useProfile, useTheme } from '@contexts';
import LayoutManager from '../LayoutManager/LayoutManager';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';

/**
 * MainLayout component - The main layout that includes sidebar and content area
 *
 * This component provides the main structure for authenticated pages with:
 * - Top navbar with navigation and search
 * - Left sidebar with main navigation items
 * - Content area managed by LayoutManager
 *
 * @example
 * ```tsx
 * <MainLayout />
 * ```
 */
export default function MainLayout(): JSX.Element {
    const { profile } = useProfile();
    const { isDarkMode, toggleTheme } = useTheme();

    const handleNotifications = () => {
        // Handle notifications panel toggle
        console.log('Toggle notifications panel');
    };

    return (
        <div className='h-screen w-screen flex flex-col overflow-hidden fixed inset-0'>
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
