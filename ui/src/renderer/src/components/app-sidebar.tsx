import Logo from '@/components/base/Logo/Logo';
import { useAuthState } from '@/hooks/auth/useAuth';
import { Link, useMatchRoute, useRouter } from '@tanstack/react-router';
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
    LayoutDashboard,
    Link2,
    Network,
    Settings,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
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
    const router = useRouter();
    const matchRoute = useMatchRoute();
    const { isEntryManager, isAdmin } = useAuthState();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    const isManageActive =
        !!matchRoute({ to: '/manage' }) ||
        !!matchRoute({ to: '/manage/entities' }) ||
        !!matchRoute({ to: '/manage/entry-types' }) ||
        !!matchRoute({ to: '/manage/type-mappings' }) ||
        !!matchRoute({ to: '/manage/users' }) ||
        !!matchRoute({ to: '/manage/enrichment' }) ||
        !!matchRoute({ to: '/manage/settings' });

    // Map current navigation items
    const navMain = [
        {
            title: 'Dashboard',
            url: '/',
            icon: LayoutDashboard,
            isActive: !!matchRoute({ to: '/' }),
        },
        {
            title: 'Notes',
            url: '/notes',
            icon: FileText,
            isActive: !!matchRoute({ to: '/notes' }),
        },
        {
            title: 'Files',
            url: '/files',
            icon: Archive,
            isActive: !!matchRoute({ to: '/files' }),
        },
        {
            title: 'Digest Data',
            url: '/digest-data',
            icon: Database,
            isActive: !!matchRoute({ to: '/digest-data' }),
        },
        {
            title: 'Reports',
            url: '/reports',
            icon: FileBarChart,
            isActive: !!matchRoute({ to: '/reports' }),
        },
        {
            title: 'Enrichment',
            url: '/enrich',
            icon: Sparkles,
            isActive: !!matchRoute({ to: '/enrich' }),
        },
        {
            title: 'Graph Explorer',
            url: '/knowledge-graph',
            icon: Network,
            isActive: !!matchRoute({ to: '/knowledge-graph' }),
        },
    ];

    const footerItems = [
        {
            title: 'Settings',
            url: '/settings',
            icon: Settings,
            isActive: !!matchRoute({ to: '/settings' }),
        },
    ];

    return (
        <Sidebar collapsible='icon' {...props}>
            <SidebarHeader
                className={`flex flex-row items-center gap-2 ${isCollapsed ? 'justify-center pt-4 px-2 pb-2' : 'pl-4 pt-4 pr-2 pb-2'}`}
            >
                <Link to='/' className='shrink-0'>
                    <Logo text={false} height='24px' />
                </Link>
                {!isCollapsed && (
                    <div className='flex flex-col text-[10px] text-muted-foreground leading-tight min-w-0'>
                        <span>Copyright © 2025 PRODAFT</span>
                        <span>v2.10.2-beta.a070af1b</span>
                    </div>
                )}
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} showLabel={true} label='General' />
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
                    showLabel={true}
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
