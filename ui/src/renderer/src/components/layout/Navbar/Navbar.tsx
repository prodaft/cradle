import SearchDialog from '@components/domain/search/SearchDialog';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Search } from 'iconoir-react';

/**
 * Navbar component - simplified navbar with sidebar trigger and search
 */
export default function Navbar(): JSX.Element {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useHotkeys(
        'ctrl+k, cmd+k',
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDialogOpen((b) => !b);
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [],
    );

    return (
        <div className='relative flex h-14 items-center gap-3 p-4 sm:gap-4 border-b border-border shrink-0'>
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
                        <Kbd>Ctrl</Kbd>
                        <span>+</span>
                        <Kbd>K</Kbd>
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
