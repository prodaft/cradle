/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import AuthProvider, { useAuth } from './AuthProvider.jsx';

describe('useAuth hook', () => {
  it('should return access and refresh as empty strings by default', () => {
    const TestComponent = () => {
      const { access, refresh } = useAuth();
      return (
        <div>
          <span data-testid="access">{access}</span>
          <span data-testid="refresh">{refresh}</span>
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
  });

  it('should update access and refresh after logging in', async () => {
    const TestComponent = () => {
      const { access, refresh, logIn } = useAuth();
      return (
        <div>
          <span data-testid="access">{access}</span>
          <span data-testid="refresh">{refresh}</span>
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

    expect(getByTestId('access').textContent).toBe('session123');
    expect(getByTestId('refresh').textContent).toBe('csrf123');
  });

  it('should clear access and refresh after logging out', async () => {
    const TestComponent = () => {
      const { access, refresh, logOut } = useAuth();
      return (
        <div>
          <span data-testid="access">{access}</span>
          <span data-testid="refresh">{refresh}</span>
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
  });
});

it('should not update access and refresh after logging in if already logged in', async () => {
    const TestComponent = () => {
        const { access, refresh, logIn } = useAuth();
        return (
            <div>
                <span data-testid="access">{access}</span>
                <span data-testid="refresh">{refresh}</span>
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

    // Attempt to log in again
    act(() => {
        getByTestId('login-button').click();
    });

    expect(getByTestId('access').textContent).toBe('session123');
    expect(getByTestId('refresh').textContent).toBe('csrf123');
});

it('should not clear access and refresh after logging out if already logged out', async () => {
    const TestComponent = () => {
        const { access, refresh, logOut } = useAuth();
        return (
            <div>
                <span data-testid="access">{access}</span>
                <span data-testid="refresh">{refresh}</span>
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

    // Attempt to log out again
    act(() => {
        getByTestId('logout-button').click();
    });

    expect(getByTestId('access').textContent).toBe('');
    expect(getByTestId('refresh').textContent).toBe('');
});