import { PageLoader } from '@/components/base/page-loader';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthState } from '@/hooks/auth/use-auth';
import { NotificationsPanel } from '@components/domain/notifications';
import { Outlet } from '@tanstack/react-router';
import React, { Suspense, useState } from 'react';
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
    const { isInitializing } = useAuthState();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const handleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    if (isInitializing) {
        return <PageLoader fill='screen' />;
    }

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
                        <Suspense fallback={<PageLoader fill='container' />}>
                            <Outlet />
                        </Suspense>
                    </div>

                    {/* Notifications Panel - Overlay */}
                    {showNotifications && (
                        <ResizablePanelGroup
                            orientation='horizontal'
                            className='absolute inset-0 z-50'
                        >
                            <ResizablePanel
                                defaultSize={75}
                                minSize={50}
                                className='cursor-pointer bg-black/50'
                                onClick={() => setShowNotifications(false)}
                            />
                            <ResizableHandle
                                withHandle
                                className='bg-muted hover:bg-primary transition-colors'
                            />
                            <ResizablePanel
                                defaultSize={25}
                                minSize={18}
                                maxSize={40}
                                className='bg-card overflow-hidden'
                            >
                                <NotificationsPanel
                                    unreadNotificationsCount={unreadNotificationsCount}
                                    setUnreadNotificationsCount={
                                        setUnreadNotificationsCount
                                    }
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
