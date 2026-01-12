import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { SidebarTrigger } from '@/components/ui/sidebar';
import SearchDialog from '@components/domain/search/SearchDialog';
import { Search } from 'iconoir-react';
import React, { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component - simplified navbar with sidebar trigger and search
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
            <SidebarTrigger />
            <div className='flex-1 flex justify-center'>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setIsDialogOpen(true)}
                    className='rounded-full max-w-xs w-full justify-between text-muted-foreground'
                >
                    <div className='flex items-center gap-2'>
                        <Search className='h-4 w-4' />
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
