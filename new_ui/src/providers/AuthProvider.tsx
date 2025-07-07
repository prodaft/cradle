import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UsersApi, TokenObtainPair } from '../services/cradle';
import { useConfiguration } from './ConfigurationProvider';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  apiClient: UsersApi | null;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiClient, setApiClient] = useState<UsersApi | null>(null);
  const { getConfiguration } = useConfiguration();

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const configuration = getConfiguration(token);
      const client = new UsersApi(configuration);
      setApiClient(client);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [getConfiguration]);

  // Automatic token refresh on API client creation
  useEffect(() => {
    if (apiClient) {
      // Set up automatic token refresh logic here if needed
      // This could involve setting up axios interceptors or similar
      console.log('API client ready with automatic token refresh support');
    }
  }, [apiClient]);

  // Check if token needs refresh periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        logout();
        return;
      }

      try {
        // Decode JWT to check expiry (basic implementation)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);
          
          // Refresh token if it expires in the next 5 minutes
          if (payload.exp && payload.exp - now < 300) {
            refreshToken();
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    // Check token expiry every 60 seconds
    const interval = setInterval(checkTokenExpiry, 60000);
    
    // Check immediately
    checkTokenExpiry();

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        logout();
        return false;
      }

      const configuration = getConfiguration();
      const tempClient = new UsersApi(configuration);

      // Call refresh endpoint with the refresh token string
      const response = await tempClient.usersRefreshCreate(refreshTokenValue);
      const tokenData = response.data;

      if (tokenData.access) {
        // Store new access token
        localStorage.setItem('access_token', tokenData.access);

        // Create new authenticated API client
        const authConfiguration = getConfiguration(tokenData.access);
        const authenticatedClient = new UsersApi(authConfiguration);
        
        setApiClient(authenticatedClient);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Token refresh error:', err);
      logout(); // Force logout on refresh failure
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Create temporary API client for login
      const configuration = getConfiguration();
      const tempClient = new UsersApi(configuration);

      // Attempt login
      const tokenData = await tempClient.usersLoginCreate({
        username,
        password
      });

      if (tokenData.access) {
        // Store tokens
        localStorage.setItem('access_token', tokenData.access);
        if (tokenData.refresh) {
          localStorage.setItem('refresh_token', tokenData.refresh);
        }

        // Create authenticated API client
        const authConfiguration = getConfiguration(tokenData.access);
        const authenticatedClient = new UsersApi(authConfiguration);
        
        setApiClient(authenticatedClient);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setApiClient(null);
    setError(null);
  };

  const value: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    loading,
    error,
    apiClient,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
