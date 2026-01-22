import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import SearchDialog from '@components/domain/search/SearchDialog';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Link, useMatches } from '@tanstack/react-router';
import React, { useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component - simplified navbar with sidebar trigger, breadcrumbs, and search
 */
export default function Navbar(): React.JSX.Element {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const matches = useMatches();

    // Build breadcrumbs from route staticData
    const breadcrumbs = useMemo(() => {
        return matches
            .filter((match) => match.staticData && (match.staticData as any).breadcrumb)
            .map((match) => {
                const breadcrumb = (match.staticData as any).breadcrumb;
                const label = typeof breadcrumb === 'function' ? breadcrumb(match) : breadcrumb;
                return {
                    label: label as string,
                    path: match.pathname,
                };
            });
    }, [matches]);

    useHotkeys(
        '/',
        (event) => {
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            setIsDialogOpen(true);
        },
        {
            enableOnFormTags: false,
            preventDefault: true,
        },
        [],
    );

    return (
        <div className='relative flex h-14 items-center gap-3 p-4 sm:gap-4 border-b border-border shrink-0 md:rounded-tl-xl md:rounded-tr-xl'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4 hidden lg:block' />
            {breadcrumbs.length > 0 && (
                <Breadcrumb className='hidden lg:block'>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            return (
                                <React.Fragment key={crumb.path}>
                                    <BreadcrumbItem className={index < breadcrumbs.length - 1 ? 'hidden md:block' : ''}>
                                        {isLast ? (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link to={crumb.path}>{crumb.label}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && (
                                        <BreadcrumbSeparator className='hidden md:block' />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
            <div className='absolute left-1/2 -translate-x-1/2'>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setIsDialogOpen(true)}
                    className='rounded-full w-64 justify-between text-muted-foreground'
                >
                    <div className='flex items-center gap-2'>
                        <MagnifyingGlassIcon className='h-4 w-4' weight="bold" />
                        <span className='text-sm'>Search...</span>
                    </div>
                    <KbdGroup className='hidden sm:flex'>
                        <Kbd>/</Kbd>
                    </KbdGroup>
                </Button>
            </div>
            <SearchDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </div>
    );
}
