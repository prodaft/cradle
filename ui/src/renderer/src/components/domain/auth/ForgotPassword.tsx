import useApi from '@/hooks/api/useApi';
import { Form, FormInput } from '@components/forms';
import { useWindowSize } from '@uidotdev/usehooks';
import { Link, useLocation } from 'react-router-dom';
import * as Yup from 'yup';

interface FormData {
    username: string;
    email: string;
}

const forgotPasswordSchema = Yup.object().shape({
    username: Yup.string().default(''),
    email: Yup.string().email('Invalid email').default(''),
}).test('at-least-one', 'You must fill at least one field!', (value) => {
    return !!(value.username || value.email);
});

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const windowSize = useWindowSize();
    const location = useLocation();
    const { usersApi } = useApi();

    const handleSubmit = async (data: FormData) => {
        await usersApi.usersResetPasswordCreate({
            passwordResetRequestRequest: {
                username: data.username || undefined,
                email: data.email || undefined,
            },
        });
    };

    return (
        <div className="min-h-screen overflow-y-auto cradle-bg-primary">
            <div className="flex min-h-screen">
                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 cradle-bg-secondary relative overflow-hidden">
                    <div className="absolute inset-0 cradle-grid-bg opacity-30"></div>

                    <div className="relative z-10 flex flex-col justify-center items-start px-16 py-12">
                        <h1 className="text-4xl font-bold cradle-text-primary cradle-mono mb-4 tracking-tight">
                            Password Recovery
                        </h1>
                        <p className="text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md">
                            Reset your password to regain access to your account.
                        </p>
                    </div>
                </div>

                {/* Right Side - Password Reset Form */}
                <div className="flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-md">
                        <div className="cradle-border cradle-bg-elevated">
                            <div className="cradle-card-header cradle-border-b">
                                <span className="cradle-mono text-xs tracking-widest">
                                    PASSWORD RECOVERY
                                </span>
                            </div>

                            <div className="p-8">
                                <p className="text-sm cradle-text-secondary mb-6 cradle-mono">
                                    Enter your username or email to receive password reset
                                    instructions.
                                </p>

                                <Form<FormData>
                                    schema={forgotPasswordSchema}
                                    defaultValues={{ username: '', email: '' }}
                                    onSubmit={handleSubmit}
                                    successMessage="Password change email sent to your inbox!"
                                    className="space-y-5"
                                >
                                    <FormInput<FormData>
                                        name="username"
                                        label="Username"
                                    />
                                    <div className="cradle-separator-labeled my-4">
                                        <span>Or</span>
                                    </div>
                                    <FormInput<FormData>
                                        name="email"
                                        label="Email"
                                        type="email"
                                    />
                                    <button
                                        type="submit"
                                        data-testid="login-register-button"
                                        className="cradle-btn cradle-btn-primary w-full"
                                    >
                                        Send Reset Link
                                    </button>
                                </Form>

                                {/* Footer Link */}
                                <div className="cradle-separator mt-8"></div>
                                <div className="text-center text-xs cradle-mono mt-6">
                                    <Link
                                        to="/login"
                                        className="cradle-text-tertiary hover:text-cradle2 uppercase tracking-wider"
                                        replace={true}
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <span className="text-xs cradle-text-muted cradle-mono tracking-wider">
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
