import { Badge } from '@/components/ui/badge';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { $api } from '@services/openapi/client';
import { useRouter } from '@tanstack/react-router';
import { LogOut, Settings, User } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

export function NavUser() {
    const { isMobile, state } = useSidebar();
    const { isLoggedIn } = useAuthActions();
    const { role } = useAuthState();
    const { data: profile } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: 'me' } } },
        { enabled: isLoggedIn(), meta: { showErrorToast: false } },
    );
    const { logOut } = useAuthActions();
    const router = useRouter();
    const isCollapsed = state === 'collapsed';

    const handleLogout = async () => {
        await logOut();
        router.navigate({ to: '/login' });
    };

    const handleSettings = () => {
        router.navigate({ to: '/settings' });
    };

    const getRoleBadgeVariant = (role?: string) => {
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'author':
                return 'default';
            case 'viewer':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size='lg'
                            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center'
                            aria-label={`User menu for ${profile?.username || 'User'}`}
                        >
                            <User className='size-4 shrink-0' />
                            <div className='grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
                                <div className='flex items-center gap-2'>
                                    <span className='truncate font-medium'>
                                        {profile?.username || 'User'}
                                    </span>
                                    {role && (
                                        <Badge
                                            variant={getRoleBadgeVariant(role)}
                                            className='text-[10px] px-1.5 py-0 h-4 leading-none'
                                        >
                                            {role.charAt(0).toUpperCase() +
                                                role.slice(1)}
                                        </Badge>
                                    )}
                                </div>
                                <span className='truncate text-xs'>
                                    {profile?.email || ''}
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                        side={isMobile ? 'bottom' : 'right'}
                        align='end'
                        sideOffset={4}
                    >
                        {/* Show user info as menu item when sidebar is collapsed */}
                        {isCollapsed && !isMobile && (
                            <>
                                <DropdownMenuItem className='flex items-center gap-2 py-2 px-2 cursor-default hover:bg-transparent focus:bg-transparent'>
                                    <User className='size-4 shrink-0' />
                                    <div className='grid flex-1 text-left text-sm leading-tight'>
                                        <div className='flex items-center gap-2'>
                                            <span className='truncate font-medium'>
                                                {profile?.username || 'User'}
                                            </span>
                                            {role && (
                                                <Badge
                                                    variant={getRoleBadgeVariant(role)}
                                                    className='text-[10px] px-1.5 py-0 h-4 leading-none'
                                                >
                                                    {role.charAt(0).toUpperCase() +
                                                        role.slice(1)}
                                                </Badge>
                                            )}
                                        </div>
                                        <span className='truncate text-xs'>
                                            {profile?.email || ''}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={handleSettings}>
                            <Settings />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
