/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthProvider from './AuthProvider.jsx';
import PrivateRoute from './PrivateRoute.jsx';
import { useNavigate } from 'react-router-dom';
import '@testing-library/jest-dom'
import {useAuth} from "../../hooks/useAuth";

describe('PrivateRoute component', () => {
    it('should redirect to fallback route when user is not authenticated', () => {
        const MockComponent = () => <div data-testid="mock-component">Mock Component</div>;
    const MockLoginComponent = () => {
        const { sessionid, csrftoken, logIn } = useAuth();
        const navigate = useNavigate();
        return (
            <div data-testid="login-page">
            <span data-testid="sessionid">{sessionid}</span>
            <span data-testid="csrftoken">{csrftoken}</span>
            <button onClick={() => {logIn('session123', 'csrf123'); navigate("/")}} data-testid="login-button">Log In</button>
            </div>
        );
    }

    const { getByTestId } = render(
        <AuthProvider>
            <MemoryRouter>
                <Routes>
                    <Route element={<PrivateRoute fallback={"/login"}/>}>
                        <Route path="/" element={<MockComponent />} />
                    </Route>
                    <Route path="/login" element={<MockLoginComponent />} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>
    );

        expect(getByTestId('login-page')).toBeInTheDocument();
        });

    it('should render the component when user authenticates', () => {
    const MockComponent = () => <div data-testid="mock-component">Mock Component</div>;
    const MockLoginComponent = () => {
        const { sessionid, csrftoken, logIn } = useAuth();
        const navigate = useNavigate();
        return (
            <div data-testid="login-page">
            <span data-testid="sessionid">{sessionid}</span>
            <span data-testid="csrftoken">{csrftoken}</span>
            <button onClick={() => {logIn('session123', 'csrf123'); navigate("/")}} data-testid="login-button">Log In</button>
            </div>
        );
    }

    const { getByTestId } = render(
        <AuthProvider>
            <MemoryRouter>
                <Routes>
                    <Route element={<PrivateRoute fallback={"/login"}/>}>
                        <Route path="/" element={<MockComponent />} />
                    </Route>
                    <Route path="/login" element={<MockLoginComponent />} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>
    );

    act(() => {
        getByTestId('login-button').click();
        });

    expect(getByTestId('mock-component')).toBeInTheDocument();
    });

  
});
