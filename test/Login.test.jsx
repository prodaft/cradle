/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../src/renderer/src/components/Login/Login';
import AuthProvider  from '../src/renderer/src/utils/Auth/AuthProvider';
import { logInReq } from '../src/renderer/src/services/AuthService';
import '@testing-library/jest-dom'


jest.mock('../src/renderer/src/services/AuthService', () => ({
  logInReq: jest.fn(),
}));

describe('Login component', () => {

  it('should submit login form with correct data and redirect to dashboard', async () => {
    const MockHome = () => <div data-testid="mock-home">Mock Home</div>;

    logInReq.mockResolvedValueOnce({ status: 200, headers: { sessionid: 'session123', csrftoken: 'csrf123' } });

    const { getByLabelText, getByTestId } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<Login />}> 
                </Route>
                <Route path="/" element={<MockHome/>}>
                </Route>`
            </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const usernameInput = getByLabelText('Username');
    const passwordInput = getByLabelText('Password');
    const loginButton = getByTestId('login-register-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(logInReq).toHaveBeenCalledWith(expect.any(FormData));
      const homePage = getByTestId('mock-home');
      expect(homePage).toBeInTheDocument();
    });
  });
});
