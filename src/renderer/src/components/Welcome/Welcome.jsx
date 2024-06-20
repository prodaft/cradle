import React from 'react';
import Logo from '../Logo/Logo';
import ListCard from '../ListCard/ListCard';

export default function Welcome() {
    // TODO useEffect to fetch statistics

    const actors = ['Actor 1', 'Actor 2', 'Actor 3', 'Actor 4', 'Actor 5'];
    const cases = ['Case 1', 'Case 2', 'Case 3', 'Case 4', 'Case 5'];
    const notes = [
        'Note 1 content...',
        'Note 2 content...',
        'Note 3 content...',
        'Note 4 content...',
        'Note 5 content...',
        'Note 6 content...',
        'Note 7 content...',
        'Note 8 content...',
        'Note 9 content...',
        'Note 10 content...',
    ];

    return (
        <div className='h-full w-full flex flex-col justify-between overflow-auto bg-gradient-to-tl from-cradle1 to-gray-2'>
            <div className='flex flex-col items-center justify-center pb-10'>
                <div className='py-8'>
                    <Logo width='200px' height='200px' />
                </div>
                <span className='flex flex-col items-center justify-center'>
                    <h1 className='text-zinc-300 text-6xl'>CRADLE</h1>
                    <h3 className='text-zinc-300 text-2xl text-center'>
                        A Hub For Managing Cyber Threat Intelligence Research Output
                    </h3>
                </span>
            </div>

            <div className='flex flex-col w-[80%] mx-auto'>
                <div className='flex flex-col md:flex-row justify-between text-zinc-300'>
                    <div className='w-full md:w-[45%] flex justify-center mb-8'>
                        <ListCard title='Top Actors' items={actors} />
                    </div>
                    <div className='w-full md:w-[45%] flex justify-center mb-8'>
                        <ListCard title='Top Cases' items={cases} />
                    </div>
                </div>
                <div className='w-full flex justify-center mb-8'>
                    <ListCard title='Recent Notes' items={notes} />
                </div>
            </div>

            <footer className='pb-5 mt-auto '>
                <div className='container mx-auto flex flex-col items-center'>
                    <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                        <a href='https://prodaft.com'>Copyright &copy; 2024 PRODAFT</a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
