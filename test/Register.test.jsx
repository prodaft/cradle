/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor} from '@testing-library/react';
import Register from '../src/renderer/src/components/Register/Register';
import { MemoryRouter} from 'react-router-dom';
import { registerReq } from '../src/renderer/src/services/AuthService';
import '@testing-library/jest-dom'


jest.mock('../src/renderer/src/services/AuthService', () => ({
  registerReq: jest.fn(),
}));

describe('Register component', () => {

  it('should submit login form with correct data and redirect to dashboard', async () => {
    registerReq.mockResolvedValueOnce({ status: 200 });

    const { getByLabelText, getByTestId } = render(
        <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const usernameInput = getByLabelText('Username');
    const passwordInput = getByLabelText('Password');
    const registerButton = getByTestId('login-register-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(registerReq).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

    it('should show error message when registration fails', async () => {
        registerReq.mockRejectedValueOnce({ response: { status: 400 } });
    
        const { getByLabelText, getByTestId } = render(
            <MemoryRouter>
            <Register />
        </MemoryRouter>
        );
    
        const usernameInput = getByLabelText('Username');
        const passwordInput = getByLabelText('Password');
        const registerButton = getByTestId('login-register-button');
    
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.click(registerButton);
    
        await waitFor(() => {
        expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });
});
