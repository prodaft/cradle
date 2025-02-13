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
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: 'password',
        vtKey: 'apikey',
        catalystKey: 'apikey',
        email_confirmed: false,
        is_active: false
    });
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const {target} = useParams();
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);
    const auth = useAuth();
    const isAdmin = auth?.isAdmin;
    const isOwnAccount = target === 'me';

    const populateAccountDetails = async () => {
        getUser(target)
            .then((res) => {
                setFormData({
                    id: res.data.id,
                    name: res.data.username,
                    email: res.data.email,
                    password: 'password',
                    vtKey: res.data.vt_api_key ? 'apikey' : '',
                    catalystKey: res.data.catalyst_api_key ? 'apikey' : '',
                    email_confirmed: res.data.email_confirmed || false,
                    is_active: res.data.is_active || false
                });
            })
            .catch(handleError);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = {};

        if (formData.password !== 'password') {
            data['password'] = formData.password;
        }

        if (formData.vtKey !== 'apikey') {
            data['vt_api_key'] = formData.vtKey;
        }

        if (formData.catalystKey !== 'apikey') {
            data['catalyst_api_key'] = formData.catalystKey;
        }

        if (isAdmin && !isOwnAccount) {
            data['email_confirmed'] = formData.email_confirmed;
            data['is_active'] = formData.is_active;
        }

        updateUser(formData.id, data)
            .then((res) => {
                setAlert({
                    show: true,
                    message: 'User updated successfully',
                    color: 'green',
                });
            })
            .catch(displayError(setAlert));
    };

    const handleInputChange = (field) => (value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCheckboxChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.checked
        }));
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
                            <FormField
                                name='name'
                                type='text'
                                labelText='Username'
                                placeholder='Username'
                                value={formData.name}
                                handleInput={handleInputChange('name')}
                                disabled={true}
                            />
                            <FormField
                                name='email'
                                type='text'
                                labelText='Email'
                                placeholder='Email'
                                value={formData.email}
                                handleInput={handleInputChange('email')}
                                disabled={true}
                            />
                            <FormField
                                name='password'
                                type='password'
                                labelText='Password'
                                placeholder='Password'
                                value={formData.password}
                                handleInput={handleInputChange('password')}
                            />
                            <FormField
                                name='vtKey'
                                type='password'
                                labelText='VirusTotal API Key'
                                placeholder='VirusTotal API Key'
                                value={formData.vtKey}
                                handleInput={handleInputChange('vtKey')}
                            />
                            <FormField
                                name='catalystKey'
                                type='password'
                                labelText='Catalyst API Key'
                                placeholder='Catalyst API Key'
                                value={formData.catalystKey}
                                handleInput={handleInputChange('catalystKey')}
                            />
                            {isAdmin && !isOwnAccount && (
                                <>
                                    <div className="form-control flex flex-row justify-between items-center">
                                        <label className="label flex justify-between w-full">
                                            <span className="label-text">Email Confirmed</span>
                                            <input 
                                                type="checkbox" 
                                                className="checkbox ml-4" 
                                                checked={formData.email_confirmed}
                                                onChange={handleCheckboxChange('email_confirmed')}
                                            />
                                        </label>
                                    </div>
                                    <div className="form-control flex flex-row justify-between items-center">
                                        <label className="label flex justify-between w-full">
                                            <span className="label-text">Account Active</span>
                                            <input 
                                                type="checkbox" 
                                                className="checkbox ml-4" 
                                                checked={formData.is_active}
                                                onChange={handleCheckboxChange('is_active')}
                                            />
                                        </label>
                                    </div>
                                </>
                            )}
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
