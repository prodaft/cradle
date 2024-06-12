import { ArrowLeft, ArrowRight, Notes } from 'iconoir-react';
import SearchDialog from '../SearchDialog/SearchDialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarButton from '../NavbarButton/NavbarButton';

/**
 * Navbar component - the main navigation bar for the application.
 * @param props - contents and handlers for the navbar
 * @param props.contents - the contents of the navbar set by other components
 * @param props.handleFleetingNotes - handler for the Fleeting Notes action
 * @returns {Navbar}
 * @constructor
 */
export default function Navbar(props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div
            className='navbar p-0.5 sticky top-0 rounded-md bg-gray-2 w-full h-fit z-40 pr-4 pl-2 min-h-12'
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
            <div className='w-full justify-end h-fit navbar-center'>
                {props.contents}
            </div>
            <div className='w-fit h-fit navbar-end'>
                {props.showFleetingNotesButton && (
                    <NavbarButton
                        text={'Fleeting Notes'}
                        icon={<Notes />}
                        onClick={props.handleFleetingNotesButton}
                        testid='fleeting-notes-button'
                    />
                )}
            </div>
        </div>
    );
}
