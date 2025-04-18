import React from 'react';
import Logo from '../Logo/Logo';

const CradleLoading = () => {
    return (
        <div className='flex flex-col items-center justify-center h-screen text-center'>
            <div className='mb-8 w-[370px]'>
                <Logo text={true}/>
            </div>
            <svg
                class='spinner-ring spinner-primary spinner-xl dark:[--spinner-color:--secondary]'
                viewBox='25 25 50 50'
                stroke-width='5'
            >
                <circle cx='50' cy='50' r='20' />
            </svg>
        </div>
    );
};

export default CradleLoading;
