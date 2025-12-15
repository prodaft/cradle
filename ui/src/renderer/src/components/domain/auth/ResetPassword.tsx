import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Form, FormInput } from '@components/forms';
import { Link, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';

interface FormData {
    password: string;
    confirmPassword: string;
}

const resetPasswordSchema = Yup.object().shape({
    password: Yup.string().required('Password is required'),
    confirmPassword: Yup.string()
        .required('Please confirm your password')
        .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

/**
 * ResetPassword component - renders the change password form
 */
export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { navigate } = useCradleNavigate();
    const { usersApi } = useApi();

    const handleSubmit = async (data: FormData) => {
        await usersApi.usersResetPasswordUpdate({
            passwordResetConfirmRequest: {
                token: token || '',
                password: data.password,
            },
        });
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-cradle3 p-8 bg-opacity-20 rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h3 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight'>
                            Change Password
                        </h3>
                    </div>
                    <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
                        <Form<FormData>
                            schema={resetPasswordSchema}
                            defaultValues={{ password: '', confirmPassword: '' }}
                            onSubmit={handleSubmit}
                            onSuccess={() => navigate('/login', { replace: true })}
                            className='space-y-6'
                        >
                            <FormInput<FormData>
                                name='password'
                                label='Password'
                                type='password'
                            />
                            <FormInput<FormData>
                                name='confirmPassword'
                                label='Confirm Password'
                                type='password'
                            />
                            <button
                                type='submit'
                                data-testid='login-register-button'
                                className='btn btn-primary btn-block'
                            >
                                Change Password
                            </button>
                        </Form>
                        <p className='mt-10 text-center text-sm text-gray-500'>
                            <Link
                                to='/login'
                                className='font-semibold leading-6 text-cradle2 hover:opacity-90 hover:shadow-gray-400'
                                replace={true}
                            >
                                Go back to login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
