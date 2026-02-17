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
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

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
        {
            title: 'Enrichment',
            url: '/enrichment',
            icon: Sparkles,
            isActive: isActive('/enrichment'),
        },
        /*
        {
            title: 'Graph Explorer',
            url: '/knowledge-graph',
            icon: Network,
            isActive: isActive('/knowledge-graph'),
        },
        */
    ];

    return (
        <Sidebar collapsible='icon' {...props}>
            <SidebarHeader
                className={`flex ${isCollapsed ? 'flex-row items-center justify-center gap-2 pt-4 px-2 pb-2' : 'flex-col items-center gap-2 pt-4 px-4 pb-0'}`}
            >
                <Link
                    to='/notes'
                    className={isCollapsed ? 'shrink-0' : 'flex w-full justify-center'}
                >
                    <Logo text={!isCollapsed} height={isCollapsed ? '24px' : '36px'} />
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
                        >
                            <Bell />
                            <span>Notifications</span>
                            {unreadNotificationsCount > 0 && (
                                <span className='ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground'>
                                    {unreadNotificationsCount > 9
                                        ? '9+'
                                        : unreadNotificationsCount}
                                </span>
                            )}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
