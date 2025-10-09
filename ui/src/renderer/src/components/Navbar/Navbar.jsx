import { ArrowLeft, ArrowRight, Search } from 'iconoir-react';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import Logo from '../Logo/Logo';
import NavbarButton from '../NavbarButton/NavbarButton';
import SearchDialog from '../SearchDialog/SearchDialog';

/**
 * Navbar component - the main navigation bar for the application.
 *
 * @function Navbar
 * @param {Object} props - the props object
 * @param {Array<NavbarButton|NavbarDropdown|NavbarSwitch>} props.contents - the contents of the navbar set by other components
 * @returns {Navbar}
 * @constructor
 */
export default function Navbar({
    contents,
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { navigate, navigateLink } = useCradleNavigate();

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
            navigate('/editor/new');
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [],
    );

    return (
        <div
            className='sticky top-0 w-full z-40 cradle-border-b h-14'
            style={{ 
                backgroundColor: 'var(--cradle-bg-topbar)',
                color: 'var(--cradle-sidebar-text)'
            }}
            data-testid='navbar-test'
        >
            <div className='px-4 h-full grid grid-cols-3 items-center gap-4'>
                <div className='flex items-center space-x-3 justify-start'>
                    <Logo text={false} height='1.5em' onClick={navigateLink('/')} />
                </div>

                <div className='flex items-center justify-center space-x-2'>
                    <NavbarButton
                        icon={
                            <ArrowLeft
                                style={{ color: 'var(--cradle-sidebar-icon)' }}
                                width='1em'
                                height='1.1em'
                                strokeWidth='1.5'
                            />
                        }
                        onClick={() => navigate(-1)}
                    />
                    <NavbarButton
                        icon={
                            <ArrowRight
                                style={{ color: 'var(--cradle-sidebar-icon)' }}
                                width='1em'
                                height='1.1em'
                                strokeWidth='1.5'
                            />
                        }
                        onClick={() => navigate(1)}
                        className='mr-2'
                    />
                    <div className='relative w-full max-w-lg'>
                        <input
                            className='w-full py-1.5 pl-10 pr-3 text-sm border bg-transparent'
                            style={{ 
                                borderColor: 'var(--cradle-border-accent)', 
                                color: 'var(--cradle-sidebar-text)',
                                outline: 'none'
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
