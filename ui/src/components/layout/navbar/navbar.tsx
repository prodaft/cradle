import SearchDialog from '@/components/domain/search/search-command';
import { setNavbarBreadcrumbSlot } from '@/components/layout/navbar/navbar-breadcrumb';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component - sidebar trigger, page breadcrumb, search and page actions
 */
export default function Navbar(): React.JSX.Element {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

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
            setIsSearchOpen(true);
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
            <Button
                variant='ghost'
                size='icon-sm'
                onClick={() => setIsSearchOpen(true)}
                title='Search (/)'
                aria-label='Search'
                className='-ml-2'
            >
                <MagnifyingGlassIcon weight='bold' />
            </Button>
            {/* Portal target for the page breadcrumb */}
            <div
                id='navbar-breadcrumb'
                ref={setNavbarBreadcrumbSlot}
                className='flex min-w-0 items-center'
            />
            {/* Portal target for page-specific actions */}
            <div id='navbar-actions' className='ml-auto flex items-center gap-2' />
            <SearchDialog
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </div>
    );
}
