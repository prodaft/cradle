/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import AuthProvider, { useAuth } from '../src/renderer/src/utils/Auth/AuthProvider.jsx';

describe('useAuth hook', () => {
  it('should return sessionid and csrftoken as empty strings by default', () => {
    const TestComponent = () => {
      const { sessionid, csrftoken } = useAuth();
      return (
        <div>
          <span data-testid="sessionid">{sessionid}</span>
          <span data-testid="csrftoken">{csrftoken}</span>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('sessionid').textContent).toBe('');
    expect(getByTestId('csrftoken').textContent).toBe('');
  });

  it('should update sessionid and csrftoken after logging in', async () => {
    const TestComponent = () => {
      const { sessionid, csrftoken, logIn } = useAuth();
      return (
        <div>
          <span data-testid="sessionid">{sessionid}</span>
          <span data-testid="csrftoken">{csrftoken}</span>
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

    expect(getByTestId('sessionid').textContent).toBe('session123');
    expect(getByTestId('csrftoken').textContent).toBe('csrf123');
  });

  it('should clear sessionid and csrftoken after logging out', async () => {
    const TestComponent = () => {
      const { sessionid, csrftoken, logOut } = useAuth();
      return (
        <div>
          <span data-testid="sessionid">{sessionid}</span>
          <span data-testid="csrftoken">{csrftoken}</span>
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

    expect(getByTestId('sessionid').textContent).toBe('');
    expect(getByTestId('csrftoken').textContent).toBe('');
  });
});

it('should not update sessionid and csrftoken after logging in if already logged in', async () => {
    const TestComponent = () => {
        const { sessionid, csrftoken, logIn } = useAuth();
        return (
            <div>
                <span data-testid="sessionid">{sessionid}</span>
                <span data-testid="csrftoken">{csrftoken}</span>
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

    expect(getByTestId('sessionid').textContent).toBe('session123');
    expect(getByTestId('csrftoken').textContent).toBe('csrf123');
});

it('should not clear sessionid and csrftoken after logging out if already logged out', async () => {
    const TestComponent = () => {
        const { sessionid, csrftoken, logOut } = useAuth();
        return (
            <div>
                <span data-testid="sessionid">{sessionid}</span>
                <span data-testid="csrftoken">{csrftoken}</span>
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

    expect(getByTestId('sessionid').textContent).toBe('');
    expect(getByTestId('csrftoken').textContent).toBe('');
});