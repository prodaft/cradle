/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import AuthProvider from '../../utils/AuthProvider/AuthProvider';
import { logInReq } from '../../services/authReqService/authReqService';
import '@testing-library/jest-dom';

jest.mock('../../services/authReqService/authReqService', () => ({
    logInReq: jest.fn(),
}));

jest.mock(
    '../../assets/ripple-ui-alert-icon.svg',
    () => 'data:image/svg+xml,<svg>Mocked SVG</svg>',
);

const MockHome = () => <div data-testid='mock-home'>Mock Home</div>;

const setupTestComponent = () =>
    render(
        <AuthProvider>
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path='/login' element={<Login />}></Route>
                    <Route path='/' element={<MockHome />}></Route>`
                </Routes>
            </MemoryRouter>
        </AuthProvider>,
    );

describe('Login component', () => {
    it('should submit login form with correct data and redirect to dashboard', async () => {
        logInReq.mockResolvedValueOnce({
            status: 200,
            data: { access: 'token123', refresh: 'refresh123' },
        });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const passwordInput = getByLabelText('Password');
        const loginButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(logInReq).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'testpassword',
            });
            const homePage = getByTestId('mock-home');
            expect(homePage).toBeInTheDocument();
        });
    });

    it('should show error message when login fails', async () => {
        logInReq.mockRejectedValueOnce({ response: { status: 401 } });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const passwordInput = getByLabelText('Password');
        const loginButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should show error message when unexpected error occurs', async () => {
        logInReq.mockRejectedValueOnce({
            response: {
                status: 500,
                data: {
                    detail: 'Internal Server Error',
                },
            },
        });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const passwordInput = getByLabelText('Password');
        const loginButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });
});
