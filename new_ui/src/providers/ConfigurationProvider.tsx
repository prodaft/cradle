import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Configuration } from '../services/cradle';

interface ConfigurationContextType {
  getConfiguration: (accessToken?: string) => Configuration;
  basePath: string;
  setBasePath: (path: string) => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [basePath, setBasePath] = useState<string>(() => {
    // Check localStorage first, then environment variable, then default
    return localStorage.getItem('api_base_path') || 
           import.meta.env.VITE_API_BASE_URL || 
           'http://localhost:8000';
  });

  // Update localStorage when basePath changes
  useEffect(() => {
    localStorage.setItem('api_base_path', basePath);
  }, [basePath]);

  const getConfiguration = (accessToken?: string): Configuration => {
    return new Configuration({
      accessToken,
      basePath
    });
  };

  const value: ConfigurationContextType = {
    getConfiguration,
    basePath,
    setBasePath
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = (): ConfigurationContextType => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};
