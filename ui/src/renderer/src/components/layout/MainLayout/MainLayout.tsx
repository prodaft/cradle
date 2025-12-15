import Tooltip from '@components/base/Tooltip/Tooltip';
import { NotificationsPanel } from '@components/domain/notifications';
import { useProfile, useTheme } from '@contexts';
import { Bell, BellNotification } from 'iconoir-react';
import { useCallback, useRef, useState } from 'react';
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
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [panelWidth, setPanelWidth] = useState(384); // 24rem default
    const isResizing = useRef(false);

    const handleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        e.preventDefault();
        
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidth(Math.max(280, Math.min(600, newWidth)));
        };
        
        const handleMouseUp = () => {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const notificationIconStyle = showNotifications
        ? { color: '#FF8C00' }
        : { color: 'var(--cradle-sidebar-icon)' };

    const notificationButton = (
        <Tooltip
            content={`${unreadNotificationsCount} Notifications`}
            side='bottom'
            key='notifications'
        >
            <button
                onClick={handleNotifications}
                className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors'
                style={notificationIconStyle}
            >
                {unreadNotificationsCount > 0 ? (
                    <BellNotification width={24} height={24} />
                ) : (
                    <Bell width={24} height={24} />
                )}
            </button>
        </Tooltip>
    );

    return (
        <div className='h-screen w-screen flex flex-col overflow-hidden fixed inset-0'>
            {/* Navbar - Top of screen */}
            <Navbar contents={[notificationButton]} />

            {/* Main Content Area - Below navbar */}
            <div className='flex-1 flex overflow-hidden relative'>
                {/* Sidebar */}
                <Sidebar isDarkMode={isDarkMode} onThemeToggle={toggleTheme} />

                {/* Content Area */}
                <div className='flex-1 overflow-hidden'>
                    <LayoutManager outletContext={{}} />
                </div>

                {/* Notifications Panel - Overlay */}
                {showNotifications && (
                    <>
                        {/* Dark backdrop */}
                        <div 
                            className='absolute inset-0 bg-black/50 z-40'
                            onClick={() => setShowNotifications(false)}
                        />
                        
                        {/* Panel */}
                        <div 
                            className='absolute right-0 top-0 h-full z-50 flex'
                            style={{ width: panelWidth }}
                        >
                            {/* Resize handle */}
                            <div 
                                className='w-[3px] h-full bg-zinc-600 hover:bg-[#FF8C00] cursor-col-resize transition-colors flex-shrink-0'
                                onMouseDown={handleMouseDown}
                            />
                            
                            {/* Panel content */}
                            <div className='flex-1 h-full cradle-bg-elevated overflow-hidden'>
                                <NotificationsPanel
                                    unreadNotificationsCount={unreadNotificationsCount}
                                    setUnreadNotificationsCount={setUnreadNotificationsCount}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
