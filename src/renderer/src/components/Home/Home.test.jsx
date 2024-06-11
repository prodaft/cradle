/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, getByTestId } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from './Home';
import { useAuth } from '../../hooks/useAuth/useAuth';
import AuthProvider from '../../utils/AuthProvider/AuthProvider';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth');

const setupTestComponent = () =>
    render(
        <AuthProvider>
            <MemoryRouter>
                <Routes>
                    <Route path='/' element={<Home />}></Route>
                    <Route path='/login' element={<div>Login</div>}></Route>
                    <Route path='/editor' element={<div>Not implemented</div>}></Route>
                </Routes>
            </MemoryRouter>
        </AuthProvider>,
    );

describe('Home Component', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({
            logOut: jest.fn(),
            isAuthenticated: jest.fn().mockReturnValue(true),
        });
    });

    test('renders Home component properly', () => {
        const { getByText, getByTestId } = setupTestComponent();

        expect(getByTestId('navbar-test')).toBeInTheDocument();
        expect(getByTestId('sidebar-test')).toBeInTheDocument();
    });

    test('calls handleLogout when clicking logout button', () => {
        const { getByText } = setupTestComponent();

        fireEvent.click(getByText('Logout'));
        expect(useAuth().logOut).toHaveBeenCalled();
    });

    test('display fleeting notes panel when clicking fleeting notes button', () => {
        const { getByTestId } = setupTestComponent();

        fireEvent.click(getByTestId('fleeting-notes-button'));
        expect(getByTestId('fleeting-notes-panel')).toBeInTheDocument();
    });
});
