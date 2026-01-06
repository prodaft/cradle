import Logo from '@components/base/Logo/Logo';
import SearchDialog from '@components/domain/search/SearchDialog';
import { useProfile } from '@contexts';
import { useNotif } from '@contexts/ui';
import { useApi, useCradleNavigate } from '@hooks';
import { handleAPIError, parseAPIError } from '@utils/api';
import { Search } from 'iconoir-react';
import { ReactNode, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component props
 */
export interface NavbarProps {
    /** Additional contents to display in the navbar (buttons, dropdowns, etc.) */
    contents: ReactNode[];
}

/**
 * Navbar component - the main navigation bar for the application
 *
 * Includes logo, navigation buttons, search functionality, and custom content.
 *
 * @example
 * ```tsx
 * <Navbar contents={[<CustomButton />, <CustomDropdown />]} />
 * ```
 */
export default function Navbar({ contents }: NavbarProps): JSX.Element {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { fleetingNotesApi } = useApi();
    const { notify } = useNotif();

    const handleCreateNewNote = async () => {
        try {
            const defaultContent =
                profile?.defaultNoteTemplate ||
                '# Untitled\n\nStart writing your note here...';
            const response = await fleetingNotesApi.fleetingNotesCreate({
                fleetingNoteRequest: {
                    content: defaultContent,
                },
            });
            navigate(`/notes/${response.id}`);
        } catch (error) {
            const parsed = await parseAPIError(error);
            handleAPIError(parsed, notify);
        }
    };

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

    useHotkeys(
        'ctrl+l, cmd+l',
        (event) => {
            event.preventDefault();
            handleCreateNewNote();
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [],
    );

    return (
        <div
            className='sticky top-0 w-full z-40 cradle-border-b h-14 shrink-0'
            style={{
                backgroundColor: 'var(--cradle-bg-topbar)',
                color: 'var(--cradle-sidebar-text)',
            }}
            data-testid='navbar-test'
        >
            <div className='px-4 h-full grid grid-cols-3 items-center gap-4'>
                <div className='flex items-center space-x-3 justify-start'>
                    <Logo text={false} height='1.5em' onClick={navigateLink('/')} />
                </div>

                <div className='flex items-center justify-center space-x-2'>
                    <div className='relative w-full max-w-lg'>
                        <input
                            className='w-full py-1.5 pl-10 pr-3 text-sm border bg-transparent rounded-full'
                            style={{
                                borderColor: 'var(--cradle-border-accent)',
                                color: 'var(--cradle-sidebar-text)',
                                outline: 'none',
                            }}
                            placeholder='Search (Ctrl+K)'
                            onClick={() => setIsDialogOpen(true)}
                            readOnly
                        />
                        <Search
                            className='absolute left-3 top-1/2 transform -translate-y-1/2'
                            style={{ color: 'var(--cradle-sidebar-icon)' }}
                            width='1em'
                            height='1em'
                            strokeWidth='1.5'
                        />
                    </div>
                    <SearchDialog
                        isOpen={isDialogOpen}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </div>

                <div className='flex items-center space-x-2 justify-end'>
                    {contents}
                </div>
            </div>
        </div>
    );
}
