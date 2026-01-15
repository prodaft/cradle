/**
 * Utility functions for creating API instances in route loaders
 * Loaders run before React context is available, so we need to create API instances directly
 */

import { QueryApi, UsersApi } from '@services/cradle/apis';
import { Configuration } from '@services/cradle/runtime';

/**
 * Get base URL from environment variable
 */
function getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL;
}

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
    return localStorage.getItem('access_token');
}

/**
 * Create API configuration for use in loaders
 */
function createLoaderConfiguration(): Configuration {
    const basePath = getBaseUrl();
    const apiBasePath = basePath;
    const accessToken = getAccessToken();

    return new Configuration({
        basePath: apiBasePath,
        accessToken: accessToken
            ? async () => {
                  // Return token from localStorage
                  return accessToken;
              }
            : undefined,
    });
}

/**
 * Create API instances for use in route loaders
 * Only creates APIs that are actually needed in loaders
 */
export function createLoaderApis() {
    const configuration = createLoaderConfiguration();

    return {
        queryApi: new QueryApi(configuration),
        usersApi: new UsersApi(configuration),
    };
}
