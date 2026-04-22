import { PageLoader } from '@/components/base/page-loader';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { NotificationsPanel } from '@components/domain/notifications';
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
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
    const { isLoggedIn } = useAuthActions();
    const [showNotifications, setShowNotifications] = useState(false);

    const { data: unreadNotifications } = useQuery({
        queryKey: queryKeys.notifications.unreadCount(),
        enabled: !isInitializing && isLoggedIn(),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/notifications/unread-count/',
            );
            if (error) throw { response, error };
            return data!;
        },
    });
    const unreadNotificationsCount = unreadNotifications?.count ?? 0;

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
                                defaultSize='75%'
                                minSize='50%'
                                className='cursor-pointer bg-black/50'
                                onClick={() => setShowNotifications(false)}
                            />
                            <ResizableHandle
                                withHandle
                                className='bg-muted hover:bg-primary transition-colors'
                            />
                            <ResizablePanel
                                defaultSize='25%'
                                minSize='25%'
                                maxSize='45%'
                                className='bg-card overflow-hidden border-l border-border shadow-xl'
                            >
                                <NotificationsPanel
                                    onClose={() => setShowNotifications(false)}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
