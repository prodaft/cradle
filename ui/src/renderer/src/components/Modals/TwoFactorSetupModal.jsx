import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { initiate2FA, enable2FA, disable2FA } from '../../services/userService/userService';
import AlertBox from '../AlertBox/AlertBox';

const TwoFactorSetupModal = ({ closeModal, onSuccess, isDisabling = false }) => {
    const [otpAuthUrl, setOtpAuthUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [alert, setAlert] = useState({
        show: false,
        message: '',
        color: 'green',
    });
    const [loading, setLoading] = useState(!isDisabling);

    useEffect(() => {
        // Only fetch 2FA setup data if we're enabling
        if (!isDisabling) {
            const setup2FA = async () => {
                try {
                    const response = await initiate2FA();
                    setOtpAuthUrl(response.data.config_url);
                    const secret = new URL(response.data.config_url).searchParams.get('secret');
                    setSecret(secret);
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                    setAlert({
                        show: true,
                        message: 'Failed to initialize 2FA setup',
                        color: 'red',
                    });
                }
            };
            setup2FA();
        }
    }, [isDisabling]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isDisabling) {
                await disable2FA(verificationCode);
            } else {
                await enable2FA(verificationCode);
            }
            onSuccess?.();
            closeModal();
        } catch (err) {
            setAlert({
                show: true,
                message: 'Invalid verification code. Please try again.',
                color: 'red',
            });
        }
    };

    if (loading) {
        return (
            <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Setting up Two-Factor Authentication</h2>
                <div className="flex justify-center">
                    <div className="loading loading-spinner loading-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
                {isDisabling ? 'Disable' : 'Set up'} Two-Factor Authentication
            </h2>
            
            {!isDisabling && (
                <div className="mb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white rounded">
                            <QRCodeSVG 
                                value={otpAuthUrl}
                                size={200}
                                level="H"
                            />
                        </div>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-100 dark:bg-zinc-800 rounded">
                        <p className="text-sm mb-2">
                            Can't scan the QR code? Enter this secret key manually in your authenticator app:
                        </p>
                        <code className="block bg-white dark:bg-zinc-900 p-2 rounded text-center select-all">
                            {secret}
                        </code>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <input
                        type="text"
                        className="input input-bordered w-full input-block"
                        placeholder={isDisabling ? 
                            "Enter code to confirm 2FA disable" : 
                            "Enter verification code"
                        }
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        pattern="[0-9]*"
                        maxLength="6"
                    />
                </div>

                <AlertBox alert={alert} />

                <div className="flex justify-end gap-2 mt-3">
                    <button 
                        type="button" 
                        className="btn" 
                        onClick={closeModal}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className={`btn ${isDisabling ? 'btn-error' : 'btn-primary'}`}
                        disabled={!verificationCode}
                    >
                        {isDisabling ? 'Disable 2FA' : 'Verify and Enable'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TwoFactorSetupModal; 