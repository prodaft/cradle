import React, { useState } from 'react';
import AlertBox from '../AlertBox/AlertBox';
import { performAction } from '../../services/managementService/managementService';

export default function EntriesManagement() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const handlePropagateAccessVectors = async () => {
        try {
            const response = await performAction('propagateAccessVectors');
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Propagate Access Vectors action triggered successfully!',
                    color: 'green',
                });
            } else {
                setAlert({
                    show: true,
                    message: 'Failed to trigger Propagate Access Vectors action.',
                    color: 'red',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Error occurred while propagating access vectors.',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                  Entry Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <div className='flex flex-col gap-4 mb-3'>
                        <button
                            type='button'
                            className='btn btn-outline'
                            onClick={handlePropagateAccessVectors}
                        >
                            Propagate Access Vectors
                        </button>
                    </div>
                    <AlertBox alert={alert} />
                </div>
            </div>
        </div>
    );
}
