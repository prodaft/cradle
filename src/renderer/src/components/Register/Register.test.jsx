/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor} from '@testing-library/react';
import Register from './Register';
import { MemoryRouter} from 'react-router-dom';
import { registerReq } from '../../services/authReqService/authReqService';
import '@testing-library/jest-dom'


jest.mock('../../services/authReqService/authReqService', () => ({
  registerReq: jest.fn(),
}));

jest.mock('../../assets/ripple-ui-alert-icon.svg', () => 'data:image/svg+xml,<svg>Mocked SVG</svg>');

const setupTestComponent = () => render(
    <MemoryRouter>
        <Register />
    </MemoryRouter>
);

describe('Register component', () => {

  it('should submit login form with correct data and redirect to dashboard', async () => {
    registerReq.mockResolvedValueOnce({ status: 200 });

    const { getByLabelText, getByTestId } = setupTestComponent();

    const usernameInput = getByLabelText('Username');
    const passwordInput = getByLabelText('Password');
    const registerButton = getByTestId('login-register-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(registerReq).toHaveBeenCalledWith({'username':'testuser','password':'testpassword'});
    });
  });

    it('should show error message when registration fails', async () => {
        registerReq.mockRejectedValueOnce({ response: { status: 400 } });
    
        const { getByLabelText, getByTestId } = setupTestComponent();
    
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
