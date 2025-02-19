import { ArrowLeft, ArrowRight, DesignNib } from 'iconoir-react';
import SearchDialog from '../SearchDialog/SearchDialog';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarButton from '../NavbarButton/NavbarButton';
import Logo from '../Logo/Logo';

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

    return (
        <div
            className='navbar p-0.5 sticky top-0 bg-gray-2 w-full h-fit z-40 pr-8 pl-2 min-h-12'
            data-testid='navbar-test'
        >
            <div className='h-fit navbar-start w-full min-w-40'>
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
                />
                <input
                    className='form-input input-sm input-ghost-primary input focus:border-primary focus:ring-0 max-w-96'
                    placeholder={'Search'}
                    onClick={() => setIsDialogOpen(true)}
                />
                <SearchDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                />
            </div>
            <div className='w-full justify-end h-fit navbar-center'>{contents}</div>
            <div className='w-fit h-fit navbar-end'>
                <NavbarButton
                    key='fleeting-notes-button'
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
