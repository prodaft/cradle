import { ArrowLeft, ArrowRight, DesignNib } from 'iconoir-react';
import SearchDialog from '../SearchDialog/SearchDialog';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarButton from '../NavbarButton/NavbarButton';
import Logo from '../Logo/Logo';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Navbar component - the main navigation bar for the application.
 *
 * @function Navbar
 * @param {Object} props - the props object
 * @param {Array<NavbarButton|NavbarDropdown|NavbarSwitch>} props.contents - the contents of the navbar set by other components
 * @param {Function} props.showFleetingNotesButton - determines if the Fleeting Notes button should be displayed
 * @param {Function} props.handleFleetingNotes - handler for the Fleeting Notes action
 * @returns {Navbar}
 * @constructor
 */
export default function Navbar({
    contents,
    showFleetingNotesButton,
    handleFleetingNotesButton,
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();

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
            className='navbar p-0.5 sticky top-0 bg-gray-2 w-full h-fit z-40 pr-4 pl-4 min-h-12 grid grid-cols-3 items-center'
            data-testid='navbar-test'
        >
            <div className='flex items-center space-x-2 justify-start'>
                <Logo text={false} height='1.5em' onClick={() => navigate('/')} />
            </div>

            <div className='flex items-center justify-center space-x-2'>
                <NavbarButton
                    icon={
                        <ArrowLeft
                            className='text-zinc-500 hover:text-cradle2'
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
                            className='text-zinc-500 hover:text-cradle2'
                            width='1em'
                            height='1.1em'
                            strokeWidth='1.5'
                        />
                    }
                    onClick={() => navigate(1)}
                    className='mr-2'
                />
                <input
                    className='form-input input-sm input-ghost-primary input focus:border-primary focus:ring-0 w-full max-w-lg'
                    placeholder={'Search'}
                    onClick={() => setIsDialogOpen(true)}
                />
                <SearchDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                />
            </div>

            <div className='flex items-center space-x-2 justify-end'>
                {contents}
                <NavbarButton
                    key='fleeting-notes-button'
                    tooltipDirection='left'
                    text={'Fleeting Notes'}
                    icon={
                        <DesignNib
                            className={`${showFleetingNotesButton ? '' : 'text-gray-500'}`}
                        />
                    }
                    onClick={handleFleetingNotesButton}
                    testid='fleeting-notes-button'
                />
            </div>
        </div>
    );
}
