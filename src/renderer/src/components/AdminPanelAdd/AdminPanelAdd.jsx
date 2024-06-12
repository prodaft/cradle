import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import AlertBox from '../AlertBox/AlertBox';
import { createActor, createCase } from '../../services/adminService/adminService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';

/**
 * AdminPanelAdd component - This component is used to display the form for adding a new Actor or Case.
 * The component contains the following fields:
 * - Name
 * - Description
 * When canceling or confirming the addition the user will be redirected to the AdminPanel.
 *
 * @param {string} type - The type of object to add. e.g. "Actor" or "Case".
 * @returns {AdminPanelAdd}
 * @constructor
 */

export default function AdminPanelAdd({ type }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [errorColor, setErrorColor] = useState('red');
    const navigate = useNavigate();
    const auth = useAuth();

    const handleSubmit = async () => {
        const data = { name: name, description: description };

        try {
            if (type === 'Actor') {
                await createActor(data, auth.access);
            } else if (type === 'Case') {
                await createCase(data, auth.access);
            }
            navigate('/admin');
        } catch (err) {
            displayError(setError, setErrorColor)(err);
        }
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                            Add New {type}
                        </h1>
                    </div>
                    <div
                        name='register-form'
                        className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'
                    >
                        <div className='space-y-6'>
                            <input
                                type='text'
                                className='form-input input input-ghost-primary input-block focus:ring-0'
                                placeholder='Name'
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            <textarea
                                className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                placeholder='Description'
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            {error && <AlertBox title={error} color={errorColor} />}
                            <button
                                className='btn btn-primary btn-block'
                                onClick={handleSubmit}
                            >
                                Add
                            </button>
                            <button
                                className='btn btn-ghost btn-block'
                                onClick={() => navigate('/admin')}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
