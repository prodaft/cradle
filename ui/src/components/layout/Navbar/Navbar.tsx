import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { SidebarTrigger } from '@/components/ui/sidebar';
import SearchDialog from '@components/domain/search/SearchDialog';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component - sidebar trigger and search
 */
export default function Navbar(): React.JSX.Element {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
            <div className='max-sm:static sm:absolute sm:left-1/2 sm:-translate-x-1/2'>
                {/* Mobile: ghost icon button */}
                <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsDialogOpen(true)}
                    className='flex sm:hidden w-8 h-8 text-muted-foreground hover:bg-secondary hover:text-foreground'
                >
                    <MagnifyingGlassIcon className='h-4 w-4' weight='bold' />
                </Button>
                {/* Desktop: outline pill button */}
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setIsDialogOpen(true)}
                    className='hidden sm:inline-flex rounded-full w-64 justify-between text-muted-foreground'
                >
                    <div className='flex items-center gap-2'>
                        <MagnifyingGlassIcon className='h-4 w-4' weight='bold' />
                        <span className='text-sm'>Search...</span>
                    </div>
                    <KbdGroup>
                        <Kbd>/</Kbd>
                    </KbdGroup>
                </Button>
            </div>
            {/* Portal target for page-specific actions */}
            <div id='navbar-actions' className='ml-auto flex items-center gap-2' />
            <SearchDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </div>
    );
}
