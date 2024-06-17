/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import Register from './Register';
import { MemoryRouter } from 'react-router-dom';
import { registerReq } from '../../services/authReqService/authReqService';
import '@testing-library/jest-dom';

jest.mock('../../services/authReqService/authReqService', () => ({
    registerReq: jest.fn(),
}));

jest.mock(
    '../../assets/ripple-ui-alert-icon.svg',
    () => 'data:image/svg+xml,<svg>Mocked SVG</svg>',
);

const setupTestComponent = () =>
    render(
        <MemoryRouter>
            <Register />
        </MemoryRouter>,
    );

describe('Register component', () => {
    it('should submit login form with correct data and redirect to dashboard', async () => {
        registerReq.mockResolvedValueOnce({ status: 200 });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const emailInput = getByLabelText('Email');
        const passwordInput = getByLabelText('Password');
        const passwordCheckInput = getByLabelText('Confirm Password');
        const registerButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, {
            target: { value: 'testuser' }
        });
        fireEvent.change(emailInput, {
            target: { value: 'john@doe.com' },
        });
        fireEvent.change(passwordInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.change(passwordCheckInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.click(registerButton);

        await waitFor(() => {
            expect(registerReq).toHaveBeenCalledWith({
                username: 'testuser',
                email: 'john@doe.com',
                password: 'Testpassword@1234',
            });
        });
    });

    it('should show error message when registration fails', async () => {
        registerReq.mockRejectedValueOnce({ response: { status: 400 } });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const emailInput = getByLabelText('Email');
        const passwordInput = getByLabelText('Password');
        const passwordCheckInput = getByLabelText('Confirm Password');
        const registerButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, {
            target: { value: 'testuser' }
        });
        fireEvent.change(emailInput, {
            target: { value: 'john@doe.com' },
        });
        fireEvent.change(passwordInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.change(passwordCheckInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.click(registerButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should show error message when unexpected error occurs', async () => {
        registerReq.mockRejectedValueOnce({ response: { status: 500 } });

        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const emailInput = getByLabelText('Email');
        const passwordInput = getByLabelText('Password');
        const passwordCheckInput = getByLabelText('Confirm Password');
        const registerButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, {
            target: { value: 'testuser' }
        });
        fireEvent.change(emailInput, {
            target: { value: 'john@doe.com' },
        });
        fireEvent.change(passwordInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.change(passwordCheckInput, {
            target: { value: 'Testpassword@1234' },
        });
        fireEvent.click(registerButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should show error message when passwords do not match', async () => {
        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const emailInput = getByLabelText('Email');
        const passwordInput = getByLabelText('Password');
        const passwordCheckInput = getByLabelText('Confirm Password');
        const registerButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, {
            target: { value: 'testuser' }
        });
        fireEvent.change(emailInput, {
            target: { value: 'john@doe.com' },
        });
        fireEvent.change(passwordInput, {
            target: { value: 'Testpassword@1' },
        });
        fireEvent.change(passwordCheckInput, {
            target: { value: 'Testpassword@2' },
        });
        fireEvent.click(registerButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should show error message when password is invalid', async () => {
        const { getByLabelText, getByTestId } = setupTestComponent();

        const usernameInput = getByLabelText('Username');
        const emailInput = getByLabelText('Email');
        const passwordInput = getByLabelText('Password');
        const passwordCheckInput = getByLabelText('Confirm Password');
        const registerButton = getByTestId('login-register-button');

        fireEvent.change(usernameInput, {
            target: { value: 'testuser' }
        });
        fireEvent.change(emailInput, {
            target: { value: 'john@doe.com' },
        });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.change(passwordCheckInput, {
            target: { value: 'testpassword' },
        });
        fireEvent.click(registerButton);

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });
});
