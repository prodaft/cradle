import { ApiContext } from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import { getApiBaseUrl } from '@/utils/url';
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
import { ReactNode, useMemo } from 'react';

interface ApiProviderProps {
    children: ReactNode;
}

/**
 * ApiProvider component - provides API instances to the application
 * Wraps components that need access to API clients
 * Automatically configures authentication based on AuthContext
 */
export function ApiProvider({ children }: ApiProviderProps) {
    const { getAccessToken, isLoggedIn, tokenVersion, basePath, setBasePath } =
        useAuth();
    const apiBasePath = useMemo(() => getApiBaseUrl(basePath), [basePath]);

    const configuration = useMemo(() => {
        return new Configuration({
            basePath: apiBasePath,
            accessToken: isLoggedIn()
                ? async () => {
                    const token = await getAccessToken();
                    return token;
                }
                : undefined,
            // Note: Don't set Content-Type as a default header here.
            // Individual API methods set it as needed (e.g., 'application/json' for JSON requests).
            // For file uploads, the browser must set 'multipart/form-data' with the boundary automatically.
        });
    }, [tokenVersion, apiBasePath, getAccessToken, isLoggedIn]);

    // Create API instances with the configuration
    const apis = useMemo(() => {
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
    }, [configuration]);

    return (
        <ApiContext.Provider value={{ ...apis, basePath: apiBasePath, setBasePath }}>
            {children}
        </ApiContext.Provider>
    );
}
