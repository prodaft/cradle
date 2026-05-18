import Logo from '@/components/base/logo/logo';
import { useAuthState } from '@/hooks/auth/use-auth';
import { Link, useMatchRoute } from '@tanstack/react-router';
import {
    Archive,
    Bell,
    BookOpen,
    Building2,
    Crown,
    Database,
    FileBarChart,
    FileText,
    HelpCircle,
    Layers,
    Link2,
    Network,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@/components/navigation/nav-main';
import { NavUser } from '@/components/navigation/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    onNotificationsClick?: () => void;
    unreadNotificationsCount?: number;
}

export function AppSidebar({
    onNotificationsClick,
    unreadNotificationsCount = 0,
    ...props
}: AppSidebarProps) {
    const matchRoute = useMatchRoute();
    const { isEntryManager, isAdmin } = useAuthState();
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const hasUnreadNotifications = unreadNotificationsCount > 0;
    const unreadCountLabel =
        unreadNotificationsCount > 9 ? '9+' : String(unreadNotificationsCount);
    const useExpandedLogo = isMobile || !isCollapsed;

    const isActive = (to: string) => !!matchRoute({ to });

    const manageRoutes = [
        '/manage',
        '/manage/entities',
        '/manage/entry-types',
        '/manage/type-mappings',
        '/manage/users',
        '/manage/enrichment',
        '/manage/settings',
    ];
    const isManageActive = manageRoutes.some(isActive);

    const isProd = import.meta.env.VITE_ENV === 'production';

    const navMain = [
        {
            title: 'Notes',
            url: '/notes',
            icon: FileText,
            isActive: isActive('/notes'),
        },
        {
            title: 'Files',
            url: '/files',
            icon: Archive,
            isActive: isActive('/files'),
        },
        {
            title: 'Digest Data',
            url: '/digest-data',
            icon: Database,
            isActive: isActive('/digest-data'),
        },
        {
            title: 'Reports',
            url: '/reports',
            icon: FileBarChart,
            isActive: isActive('/reports'),
        },
        ...(isProd
            ? []
            : [
                  {
                      title: 'Enrichment',
                      url: '/enrichment',
                      icon: Sparkles,
                      isActive: isActive('/enrichment'),
                  },
                  {
                      title: 'Knowledge Graph',
                      url: '/knowledge-graph',
                      icon: Network,
                      isActive: isActive('/knowledge-graph'),
                  },
              ]),
    ];

    return (
        <Sidebar collapsible='icon' {...props}>
            <SidebarHeader
                className={`flex ${useExpandedLogo ? 'flex-col items-start gap-2 pt-4 px-4 pb-0' : 'flex-row items-center justify-center gap-2 pt-4 px-2 pb-2'}`}
            >
                <Link
                    to='/notes'
                    className={
                        useExpandedLogo ? 'flex w-full justify-start' : 'shrink-0'
                    }
                >
                    <Logo
                        text={useExpandedLogo}
                        height={useExpandedLogo ? '36px' : '24px'}
                    />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} showLabel label='General' />
                <NavMain
                    items={[
                        ...(isEntryManager
                            ? [
                                  {
                                      title: 'Manage',
                                      url: '/manage',
                                      icon: Crown,
                                      isActive: isManageActive,
                                      items: [
                                          {
                                              title: 'Entities',
                                              url: '/manage/entities',
                                              icon: Building2,
                                          },
                                          {
                                              title: 'Entry Types',
                                              url: '/manage/entry-types',
                                              icon: Layers,
                                          },
                                          {
                                              title: 'Type Mappings',
                                              url: '/manage/type-mappings',
                                              icon: Link2,
                                          },
                                          ...(isAdmin
                                              ? [
                                                    {
                                                        title: 'Users',
                                                        url: '/manage/users',
                                                        icon: Users,
                                                    },
                                                    {
                                                        title: 'Enrichment',
                                                        url: '/manage/enrichment',
                                                        icon: Sparkles,
                                                    },
                                                    {
                                                        title: 'Settings',
                                                        url: '/manage/settings',
                                                        icon: Wrench,
                                                    },
                                                ]
                                              : []),
                                      ],
                                  },
                              ]
                            : []),
                        {
                            title: 'Documentation',
                            url: 'https://cradle.sh/docs/',
                            icon: BookOpen,
                            isActive: false,
                        },
                        {
                            title: 'Help',
                            url: 'https://github.com/prodaft/cradle/issues',
                            icon: HelpCircle,
                            isActive: false,
                        },
                    ]}
                    showLabel
                    label='Other'
                />
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip='Notifications'
                            onClick={onNotificationsClick}
                            className={cn(
                                hasUnreadNotifications &&
                                    isCollapsed &&
                                    'overflow-visible',
                            )}
                        >
                            <span className='relative inline-flex size-4 shrink-0 items-center justify-center'>
                                <Bell className='size-4' aria-hidden />
                                {hasUnreadNotifications && isCollapsed ? (
                                    <span
                                        className={cn(
                                            'pointer-events-none absolute right-0 top-0 z-10 flex h-4 min-w-4 translate-x-[58%] -translate-y-[58%] items-center justify-center rounded-full border-2 border-sidebar bg-primary px-0.5 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums',
                                        )}
                                        aria-label={`${unreadNotificationsCount} unread notifications`}
                                    >
                                        {unreadCountLabel}
                                    </span>
                                ) : null}
                            </span>
                            <span>Notifications</span>
                            {hasUnreadNotifications && !isCollapsed ? (
                                <span className='ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums'>
                                    {unreadCountLabel}
                                </span>
                            ) : null}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
