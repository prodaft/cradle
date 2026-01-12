/**
 * Utility functions for creating API instances in route loaders
 * Loaders run before React context is available, so we need to create API instances directly
 */

import {
    AccessApi,
    CradleStatisticsApi,
    EntriesApi,
    FileTransferApi,
    IntelioApi,
    KnowledgeGraphApi,
    LogsApi,
    LspApi,
    ManagementApi,
    NotesApi,
    NotificationsApi,
    PublishApi,
    QueryApi,
    UserApi,
} from '@services/cradle/apis';
import { Configuration } from '@services/cradle/runtime';
import { getApiBaseUrl } from './url';

/**
 * Get base URL from localStorage
 */
function getBaseUrl(): string {
    const basePath = localStorage.getItem('base_path') || '';
    return basePath || window.location.origin;
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
    const apiBasePath = getApiBaseUrl(basePath);
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
 */
export function createLoaderApis() {
    const configuration = createLoaderConfiguration();

    return {
        accessApi: new AccessApi(configuration),
        entriesApi: new EntriesApi(configuration),
        fileTransferApi: new FileTransferApi(configuration),
        intelioApi: new IntelioApi(configuration),
        knowledgeGraphApi: new KnowledgeGraphApi(configuration),
        logsApi: new LogsApi(configuration),
        lspApi: new LspApi(configuration),
        managementApi: new ManagementApi(configuration),
        notesApi: new NotesApi(configuration),
        notificationsApi: new NotificationsApi(configuration),
        queryApi: new QueryApi(configuration),
        reportsApi: new PublishApi(configuration),
        statisticsApi: new CradleStatisticsApi(configuration),
        usersApi: new UserApi(configuration),
    };
}
