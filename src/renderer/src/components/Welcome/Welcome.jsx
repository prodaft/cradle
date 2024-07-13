import React, { useRef, useState, useEffect } from 'react';
import Logo from '../Logo/Logo';
import EntryListCard from '../EntryListCard/EntryListCard';
import NoteListCard from '../NoteListCard/NoteListCard';
import useChangeFlexDirectionBySize from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
import { getStatistics } from '../../services/statisticsService/statisticsService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { useNavigate } from 'react-router-dom';

/**
 * The Welcome component is the landing page of the application.
 * It displays a welcome message and some statistics about the actors, entities, and notes in the system.
 *
 * @function Welcome
 * @returns {Welcome}
 * @constructor
 */
export default function Welcome() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [artifacts, setArtifacts] = useState([]);
    const [entities, setEntities] = useState([]);
    const [notes, setNotes] = useState([]);
    const entryListsDiv = useRef(null);
    const flexDirection = useChangeFlexDirectionBySize(entryListsDiv);
    const entryCardWrapperWidth = flexDirection === 'flex-row' ? 'w-[45%]' : 'w-full';
    const navigate = useNavigate();

    useEffect(() => {
        getStatistics()
            .then((response) => {
                const { artifacts, entities, notes } = response.data;
                setArtifacts(artifacts);
                setEntities(entities);
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
                        ref={entryListsDiv}
                    >
                        <div
                            className={`${entryCardWrapperWidth} flex justify-center mb-8`}
                        >
                            <EntryListCard title='Recent Entities' items={entities} />
                        </div>
                        <div
                            className={`${entryCardWrapperWidth} flex justify-center mb-8`}
                        >
                            <EntryListCard title='Recent Artifacts' items={artifacts} />
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
