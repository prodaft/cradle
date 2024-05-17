/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import AuthProvider from './AuthProvider.jsx';
import {useAuth} from "../../hooks/useAuth/useAuth.js";
import {jwtDecode} from "jwt-decode";

describe('useAuth hook', () => {
  it('should return access and refresh as empty strings by default', () => {
    const TestComponent = () => {
      const { access, refresh, isAdmin } = useAuth();
      return (
        <div>
          <span data-testid="access">{access}</span>
          <span data-testid="refresh">{refresh}</span>
          <span data-testid="isAdmin">{isAdmin.toString()}</span>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('access').textContent).toBe('');
    expect(getByTestId('refresh').textContent).toBe('');
    expect(getByTestId('isAdmin').textContent).toBe('false');
  });

  it('should update access and refresh after logging in', async () => {
    const TestComponent = () => {
      const { access, refresh, logIn, isAdmin } = useAuth();
      return (
          <div>
              <span data-testid="access">{access}</span>
              <span data-testid="refresh">{refresh}</span>
              <span data-testid="isAdmin">{isAdmin.toString()}</span>
              <button onClick={() => logIn('session123', 'csrf123')} data-testid="login-button">Log In</button>
          </div>
      );
    };

      const {getByTestId} = render(
          <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      getByTestId('login-button').click();
    });

    expect(getByTestId('access').textContent).toBe('session123');
    expect(getByTestId('refresh').textContent).toBe('csrf123');
      expect(getByTestId('isAdmin').textContent).toBe('false');
  });

    it('should update access and refresh after logging in with real token - admin false', async () => {
        let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc19hZG1pbiI6ZmFsc2V9.iSULssAolUioOBE6qs2EyxW5ygZuxZEdgCbEndWWBeA'

        const TestComponent = () => {
            const { access, refresh, logIn, isAdmin } = useAuth();
            return (
                <div>
                    <span data-testid="access">{access}</span>
                    <span data-testid="refresh">{refresh}</span>
                    <span data-testid="isAdmin">{isAdmin.toString()}</span>
                    <button onClick={() => logIn(token, 'csrf123')} data-testid="login-button">Log In</button>
                </div>
            );
        };

        const {getByTestId} = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        act(() => {
            getByTestId('login-button').click();
        });

        expect(getByTestId('access').textContent).toBe(token);
        expect(getByTestId('refresh').textContent).toBe('csrf123');
        expect(getByTestId('isAdmin').textContent).toBe('false');
    });

    it('should update access and refresh after logging in with real token - admin true', async () => {
        let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc19hZG1pbiI6dHJ1ZX0.wldE4kYw8WXq3SvZyRNcugit9bkuRzDUV_aAdVKDs1U'

        const TestComponent = () => {
            const { access, refresh, logIn, isAdmin } = useAuth();
            return (
                <div>
                    <span data-testid="access">{access}</span>
                    <span data-testid="refresh">{refresh}</span>
                    <span data-testid="isAdmin">{isAdmin.toString()}</span>
                    <button onClick={() => logIn(token, 'csrf123')} data-testid="login-button">Log In</button>
                </div>
            );
        };

        const {getByTestId} = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        act(() => {
            getByTestId('login-button').click();
        });

        console.log(jwtDecode(token)["is_admin"])

        expect(getByTestId('access').textContent).toBe(token);
        expect(getByTestId('refresh').textContent).toBe('csrf123');
        expect(getByTestId('isAdmin').textContent).toBe('true');
    });

  it('should clear access and refresh after logging out', async () => {
    const TestComponent = () => {
      const { access, refresh, logOut, isAdmin } = useAuth();
      return (
        <div>
          <span data-testid="access">{access}</span>
          <span data-testid="refresh">{refresh}</span>
            <span data-testid="isAdmin">{isAdmin.toString()}</span>
          <button onClick={() => logOut()} data-testid="logout-button">Log Out</button>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      getByTestId('logout-button').click();
    });

    expect(getByTestId('access').textContent).toBe('');
    expect(getByTestId('refresh').textContent).toBe('');
    expect(getByTestId('isAdmin').textContent).toBe('false');
  });

    it('should not update access and refresh after logging in if already logged in', async () => {
        const TestComponent = () => {
            const { access, refresh, logIn, isAdmin } = useAuth();
            return (
                <div>
                    <span data-testid="access">{access}</span>
                    <span data-testid="refresh">{refresh}</span>
                    <span data-testid="isAdmin">{isAdmin.toString()}</span>
                    <button onClick={() => logIn('session123', 'csrf123')} data-testid="login-button">Log In</button>
                </div>
            );
        };

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        act(() => {
            getByTestId('login-button').click();
        });

        act(() => {
            getByTestId('login-button').click();
        });

        expect(getByTestId('access').textContent).toBe('session123');
        expect(getByTestId('refresh').textContent).toBe('csrf123');
        expect(getByTestId('isAdmin').textContent).toBe('false');
    });

    it('should not clear access and refresh after logging out if already logged out', async () => {
        const TestComponent = () => {
            const { access, refresh, logOut, isAdmin } = useAuth();
            return (
                <div>
                    <span data-testid="access">{access}</span>
                    <span data-testid="refresh">{refresh}</span>
                    <span data-testid="isAdmin">{isAdmin.toString()}</span>
                    <button onClick={() => logOut()} data-testid="logout-button">Log Out</button>
                </div>
            );
        };

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        act(() => {
            getByTestId('logout-button').click();
        });

        act(() => {
            getByTestId('logout-button').click();
        });

        expect(getByTestId('access').textContent).toBe('');
        expect(getByTestId('refresh').textContent).toBe('');
        expect(getByTestId('isAdmin').textContent).toBe('false');
    });
});

