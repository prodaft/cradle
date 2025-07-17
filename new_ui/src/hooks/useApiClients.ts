import { useAuth } from '../providers/AuthProvider';
import { useConfiguration } from '../providers/ConfigurationProvider';
import { 
  AccessApi, 
  EntriesApi, 
  NotesApi,
  // Add other API classes as needed
} from '../services/cradle';

/**
 * Hook to get authenticated API clients
 * Returns configured API clients with authentication tokens
 */
export const useApiClients = () => {
  const { apiClient } = useAuth();
  const { getConfiguration } = useConfiguration();

  // Get the current access token from localStorage
  const getAccessToken = () => localStorage.getItem('access_token');

  // Create authenticated API clients
  const createApiClient = <T>(ApiClass: new (config: any) => T): T | null => {
    const token = getAccessToken();
    if (!token) return null;
    
    const configuration = getConfiguration(token);
    return new ApiClass(configuration);
  };

  return {
    // The main authenticated UsersApi client from AuthProvider
    usersApi: apiClient,
    
    // Other API clients - created on demand
    accessApi: createApiClient(AccessApi),
    entriesApi: createApiClient(EntriesApi),
    notesApi: createApiClient(NotesApi),
    
    // Utility function to create any API client
    createApiClient,
    
    // Configuration getter for custom usage
    getConfiguration: () => {
      const token = getAccessToken();
      return getConfiguration(token || undefined);
    }
  };
};

/**
 * Hook to get unauthenticated API clients (for public endpoints)
 */
export const usePublicApiClients = () => {
  const { getConfiguration } = useConfiguration();

  const createPublicApiClient = <T>(ApiClass: new (config: any) => T): T => {
    const configuration = getConfiguration();
    return new ApiClass(configuration);
  };

  return {
    createPublicApiClient,
    getConfiguration: () => getConfiguration()
  };
};
