import React, { useRef, useState, useEffect } from 'react';
import Logo from '../Logo/Logo';
import EntityListCard from '../EntityListCard/EntityListCard';
import NoteListCard from '../NoteListCard/NoteListCard';
import useChangeFlexDirectionBySize from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
import { getStatistics } from '../../services/statisticsService/statisticsService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { useNavigate } from 'react-router-dom';

/**
 * The Welcome component is the landing page of the application.
 * It displays a welcome message and some statistics about the actors, cases, and notes in the system.
 *
 * @returns {Welcome}
 */
export default function Welcome() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [actors, setActors] = useState([]);
    const [cases, setCases] = useState([]);
    const [notes, setNotes] = useState([]);
    const entityListsDiv = useRef(null);
    const flexDirection = useChangeFlexDirectionBySize(entityListsDiv);
    const entityCardWrapperWidth = flexDirection === 'flex-row' ? 'w-[45%]' : 'w-full';
    const navigate = useNavigate();

    useEffect(() => {
        getStatistics()
            .then((response) => {
                const { actors, cases, notes } = response.data;
                setActors(actors);
                setCases(cases);
                setNotes(notes);
            })
            .catch(displayError(setAlert, navigate));
    }, []);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-full w-full flex flex-col justify-between items-center overflow-auto dark:bg-gradient-to-tl dark:from-cradle1 dark:to-gray-2'>
                <div className='flex flex-row items-center justify-around py-10 w-[80%]'>
                    <div className='px-8 hidden md:block'>
                        <Logo width='200px' />
                    </div>
                    <span className='flex flex-col'>
                        <h1 className='dark:text-zinc-300 text-6xl text-center md:text-left'>
                            CRADLE
                        </h1>
                        <h3 className='dark:text-zinc-300 text-2xl text-center md:text-left'>
                            A Hub For Managing Cyber Threat Intelligence Research Output
                        </h3>
                    </span>
                </div>

                <div className='flex flex-col w-[80%] mx-auto'>
                    <div
                        className={`flex ${flexDirection} justify-between dark:text-zinc-300`}
                        ref={entityListsDiv}
                    >
                        <div
                            className={`${entityCardWrapperWidth} flex justify-center mb-8`}
                        >
                            <EntityListCard title='Recent Actors' items={actors} />
                        </div>
                        <div
                            className={`${entityCardWrapperWidth} flex justify-center mb-8`}
                        >
                            <EntityListCard title='Recent Cases' items={cases} />
                        </div>
                    </div>
                    <div className='w-full flex justify-center mb-8'>
                        <NoteListCard title='Recent Notes' notes={notes} />
                    </div>
                </div>

                <footer className='pb-5 mt-auto '>
                    <div className='container mx-auto flex flex-col items-center'>
                        <p
                            className='mt-6 !text-sm !font-normal text-zinc-500 hover:cursor-pointer hover:opacity-80'
                            onClick={() => window.open('https://prodaft.com')}
                        >
                            Copyright &copy; 2024 PRODAFT
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
