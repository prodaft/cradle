import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../FormField/FormField';
import AlertBox from '../AlertBox/AlertBox';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { changePassword } from '../../services/userService/userService';

/**
 * ChangePassword component - allows an authenticated user to change their password
 * by providing their old password and a new password.
 *
 * @function ChangePassword
 * @returns {JSX.Element}
 */
export default function ChangePassword() {
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [alert, setAlert] = useState({
        show: false,
        message: '',
        color: 'red',
    });

    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Optional: check if new passwords match
        if (formData.newPassword !== formData.confirmNewPassword) {
            setAlert({
                show: true,
                message: 'New passwords do not match.',
                color: 'red',
            });
            return;
        }

        try {
            await changePassword(formData.oldPassword, formData.newPassword);
            setAlert({
                show: true,
                message: 'Password changed successfully',
                color: 'green',
            });
        } catch (err) {
            console.log(err);
            handleError(err);
        }
    };

    const handleInputChange = (field) => (value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                            Change Password
                        </h1>
                    </div>

                    <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
                        <form className='space-y-6' onSubmit={handleSubmit}>
                            <FormField
                                name='oldPassword'
                                type='password'
                                labelText='Old Password'
                                placeholder='Enter your current password'
                                value={formData.oldPassword}
                                handleInput={handleInputChange('oldPassword')}
                            />

                            <FormField
                                name='newPassword'
                                type='password'
                                labelText='New Password'
                                placeholder='Enter your new password'
                                value={formData.newPassword}
                                handleInput={handleInputChange('newPassword')}
                            />

                            <FormField
                                name='confirmNewPassword'
                                type='password'
                                labelText='Confirm New Password'
                                placeholder='Re-enter your new password'
                                value={formData.confirmNewPassword}
                                handleInput={handleInputChange('confirmNewPassword')}
                            />

                            <AlertBox alert={alert} />

                            <button type='submit' className='btn btn-primary btn-block'>
                                Change Password
                            </button>
                            <button
                                type='button'
                                className='btn btn-ghost btn-block'
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
