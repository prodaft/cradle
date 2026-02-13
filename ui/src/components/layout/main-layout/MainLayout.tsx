import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { NotificationsPanel } from '@components/domain/notifications';
import { Outlet } from '@tanstack/react-router';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../navbar/navbar';

/**
 * MainLayout component - The main layout that includes sidebar and content area
 *
 * This component provides the main structure for authenticated pages with:
 * - Top navbar with navigation and search
 * - Left sidebar with main navigation items
 * - Content area with route outlet
 *
 * @example
 * ```tsx
 * <MainLayout />
 * ```
 */
export default function MainLayout(): React.JSX.Element {
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

    useEffect(() => {
        return () => {
            if (isResizing.current) {
                isResizing.current = false;
            }
        };
    }, []);

    return (
        <SidebarProvider defaultOpen={false}>
            {/* Sidebar */}
            <AppSidebar
                onNotificationsClick={handleNotifications}
                unreadNotificationsCount={unreadNotificationsCount}
            />

            {/* Main Content Area with Navbar */}
            <SidebarInset className='flex flex-col overflow-hidden'>
                {/* Navbar - Top of screen */}
                <Navbar />

                {/* Content Area */}
                <div className='flex-1 overflow-hidden relative'>
                    <div className='absolute inset-0 overflow-y-auto overflow-x-hidden'>
                        <Suspense
                            fallback={
                                <div className='flex items-center justify-center h-full'>
                                    <Spinner className='size-10' />
                                </div>
                            }
                        >
                            <Outlet />
                        </Suspense>
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
                                    className='w-[3px] h-full bg-muted hover:bg-primary cursor-col-resize transition-colors flex-shrink-0'
                                    onMouseDown={handleMouseDown}
                                />

                                {/* Panel content */}
                                <div className='flex-1 h-full bg-card overflow-hidden'>
                                    <NotificationsPanel
                                        unreadNotificationsCount={
                                            unreadNotificationsCount
                                        }
                                        setUnreadNotificationsCount={
                                            setUnreadNotificationsCount
                                        }
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
