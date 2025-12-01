import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Form, FormInput } from '@components/forms';
import { Link, useLocation } from 'react-router-dom';
import * as Yup from 'yup';

interface FormData {
    username: string;
    email: string;
    password: string;
    passwordCheck: string;
}

const registerSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required'),
    passwordCheck: Yup.string()
        .required('Please confirm your password')
        .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

/**
 * Register component - renders the registration form.
 * Register new user in the system.
 * On successful registration, user is redirected to the login page.
 * On error, displays an error message.
 */
export default function Register() {
    const { navigate } = useCradleNavigate();
    const location = useLocation();
    const { usersApi } = useApi();

    const handleSubmit = async (data: FormData) => {
        await usersApi.usersCreate({
            userCreateRequest: {
                username: data.username,
                email: data.email,
                password: data.password,
            },
        });
    };

    return (
        <div className='min-h-screen overflow-y-auto cradle-bg-primary'>
            <div className='flex min-h-screen'>
                {/* Left Side - Branding */}
                <div className='hidden lg:flex lg:w-1/2 cradle-bg-secondary relative overflow-hidden'>
                    <div className='absolute inset-0 cradle-grid-bg opacity-30'></div>

                    <div className='relative z-10 flex flex-col justify-center items-start px-16 py-12'>
                        <h1 className='text-4xl font-bold cradle-text-primary cradle-mono mb-4 tracking-tight'>
                            Join Cradle
                        </h1>
                        <p className='text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md'>
                            Create an account to start building your knowledge
                            repository.
                        </p>
                    </div>
                </div>

                {/* Right Side - Registration Form */}
                <div className='flex-1 flex items-center justify-center px-4 py-12'>
                    <div className='w-full max-w-md'>
                        <div className='cradle-border cradle-bg-elevated'>
                            <div className='cradle-card-header cradle-border-b'>
                                <span className='cradle-mono text-xs tracking-widest'>
                                    USER REGISTRATION
                                </span>
                            </div>

                            <div className='p-8'>
                                <Form<FormData>
                                    schema={registerSchema}
                                    defaultValues={{
                                        username: '',
                                        email: '',
                                        password: '',
                                        passwordCheck: '',
                                    }}
                                    onSubmit={handleSubmit}
                                    onSuccess={() =>
                                        navigate('/login', {
                                            state: location.state,
                                            replace: true,
                                        })
                                    }
                                    className='space-y-5'
                                >
                                    <FormInput<FormData>
                                        name='username'
                                        label='Username'
                                    />
                                    <FormInput<FormData>
                                        name='email'
                                        label='Email'
                                        type='email'
                                    />
                                    <FormInput<FormData>
                                        name='password'
                                        label='Password'
                                        type='password'
                                    />
                                    <FormInput<FormData>
                                        name='passwordCheck'
                                        label='Confirm Password'
                                        type='password'
                                    />
                                    <button
                                        type='submit'
                                        data-testid='login-register-button'
                                        className='cradle-btn cradle-btn-primary w-full'
                                    >
                                        Create Account
                                    </button>
                                </Form>

                                {/* Footer Link */}
                                <div className='cradle-separator mt-8'></div>
                                <div className='text-center text-xs cradle-mono mt-6'>
                                    <span className='cradle-text-tertiary'>
                                        Already have an account?{' '}
                                    </span>
                                    <Link
                                        to='/login'
                                        className='cradle-text-tertiary hover:text-cradle2 uppercase tracking-wider'
                                        state={location.state}
                                        replace={true}
                                    >
                                        Login
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className='mt-6 text-center'>
                            <span className='text-xs cradle-text-muted cradle-mono tracking-wider'>
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
