import React, { useState, useEffect } from 'react';
import { UserCircle } from 'iconoir-react';
import FormField from '../FormField/FormField';
import { Link, useLocation } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { logInReq } from '../../services/authReqService/authReqService';
import AlertBox from '../AlertBox/AlertBox';
import useAuth from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useWindowSize } from '@uidotdev/usehooks';
import { getUser, updateUser } from '../../services/userService/userService';

/**
 * Login component - renders the login form.
 * Sets the username and password states for the AuthProvider when successfully logged in with the server
 * On error, displays an error message.
 *
 * @function AccountSettings
 * @returns {AccountSettings}
 * @constructor
 */
export default function AccountSettings() {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password');
    const [vtKey, setVtKey] = useState('');
    const [catalystKey, setCatalystKey] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);

    const auth = useAuth();

    const populateAccountDetails = async () => {
        getUser('me')
            .then((res) => {
                console.log(res.data);
                setId(res.data.id);
                setName(res.data.username);
                setEmail(res.data.email);
                if (res.data.vt_api_key) setVtKey('apikey');
                if (res.data.catalyst_api_key) setCatalystKey('apikey');
            })
            .catch(handleError);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = {};

        if (password !== 'password') {
            data['password'] = password;
        }

        if (vtKey !== 'apikey') {
            data['vt_api_key'] = vtKey;
        }

        if (catalystKey !== 'apikey') {
            data['catalyst_api_key'] = catalystKey;
        }

        updateUser(id, data)
            .then((res) => {
                setAlert({
                    show: true,
                    message: 'User updated successfully',
                    color: 'green',
                });
            })
            .catch(displayError(setAlert));
    };

    useEffect(() => {
        populateAccountDetails();
    }, []);

    return (
        <div className='flex flex-row items-center justify-center h-screen'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                            Account Settings
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
                                placeholder='Username'
                                disabled
                                value={name}
                            />
                            <input
                                type='text'
                                className='form-input input input-ghost-primary input-block focus:ring-1'
                                disabled
                                placeholder='Email'
                                value={email}
                            />
                            <input
                                type='password'
                                className='form-input input input-ghost-primary input-block focus:ring-1'
                                placeholder='Password'
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                            />
                            <input
                                type='password'
                                className='form-input input input-ghost-primary input-block focus:ring-1'
                                placeholder='VirusTotal API Key'
                                onChange={(e) => setVtKey(e.target.value)}
                                value={vtKey}
                            />
                            <input
                                type='password'
                                className='form-input input input-ghost-primary input-block focus:ring-1'
                                placeholder='Catalyst API Key'
                                onChange={(e) => setCatalystKey(e.target.value)}
                                value={catalystKey}
                            />
                            <AlertBox alert={alert} />
                            <button
                                className='btn btn-primary btn-block'
                                onClick={handleSubmit}
                            >
                                Save
                            </button>
                            <button
                                className='btn btn-ghost btn-block'
                                onClick={() => navigate('/admin')}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
