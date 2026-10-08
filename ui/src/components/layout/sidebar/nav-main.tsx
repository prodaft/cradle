import { Link, useMatchRoute, useRouter } from '@tanstack/react-router';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';

export function NavMain({
    items,
    showLabel = false,
    label = 'Navigation',
}: {
    items: {
        title: string;
        url: string;
        icon?: LucideIcon;
        isActive?: boolean;
        items?: {
            title: string;
            url: string;
            icon?: LucideIcon;
        }[];
    }[];
    showLabel?: boolean;
    label?: string;
}) {
    const router = useRouter();
    const matchRoute = useMatchRoute();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    const isSubItemActive = (subItemUrl: string) => {
        return !!matchRoute({ to: subItemUrl as any });
    };

    const isExternalUrl = (url: string) => {
        return url.startsWith('http://') || url.startsWith('https://');
    };

    const handleClick = (url: string, e?: React.MouseEvent) => {
        if (isExternalUrl(url)) {
            e?.preventDefault();
            window.open(url, '_blank', 'noopener');
        } else {
            e?.preventDefault();
            router.navigate({ to: url as any });
        }
    };

    return (
        <SidebarGroup>
            {showLabel && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
            <SidebarMenu className='gap-1'>
                {items.map((item) =>
                    item.items && item.items.length > 0 ? (
                        isCollapsed ? (
                            <SidebarMenuItem key={item.title}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={item.isActive}
                                            />
                                        }
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className='ml-auto' />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side='right'
                                        align='start'
                                        className='w-48'
                                    >
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>
                                                {item.title}
                                            </DropdownMenuLabel>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        {item.items.map((subItem) => (
                                            <DropdownMenuItem
                                                key={subItem.title}
                                                className={
                                                    isSubItemActive(subItem.url)
                                                        ? 'bg-accent'
                                                        : ''
                                                }
                                                render={
                                                    isExternalUrl(subItem.url) ? (
                                                        <a
                                                            href={subItem.url}
                                                            onClick={(e) =>
                                                                handleClick(
                                                                    subItem.url,
                                                                    e,
                                                                )
                                                            }
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                        />
                                                    ) : (
                                                        <Link to={subItem.url as any} />
                                                    )
                                                }
                                            >
                                                {subItem.icon && <subItem.icon />}
                                                <span className='max-w-52 text-wrap'>
                                                    {subItem.title}
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        ) : (
                            <Collapsible
                                key={item.title}
                                defaultOpen={item.isActive}
                                className='group/collapsible'
                                render={<SidebarMenuItem />}
                            >
                                <CollapsibleTrigger
                                    render={
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={item.isActive}
                                        />
                                    }
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                    <ChevronRight className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton
                                                    isActive={isSubItemActive(
                                                        subItem.url,
                                                    )}
                                                    render={
                                                        isExternalUrl(subItem.url) ? (
                                                            <a
                                                                href={subItem.url}
                                                                onClick={(e) =>
                                                                    handleClick(
                                                                        subItem.url,
                                                                        e,
                                                                    )
                                                                }
                                                                target='_blank'
                                                                rel='noopener noreferrer'
                                                            />
                                                        ) : (
                                                            <Link
                                                                to={subItem.url as any}
                                                            />
                                                        )
                                                    }
                                                >
                                                    <span>{subItem.title}</span>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </Collapsible>
                        )
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            {isExternalUrl(item.url) ? (
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={item.isActive}
                                    onClick={(e) => handleClick(item.url, e)}
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            ) : (
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={item.isActive}
                                    render={<Link to={item.url as any} />}
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
