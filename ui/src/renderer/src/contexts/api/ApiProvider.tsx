import { ApiContext } from '@/hooks/api/useApi';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import { queryClient } from '@/query/queryClient';
import {
    AccessApi,
    EntriesApi,
    FileTransferApi,
    IntelioApi,
    KnowledgeGraphApi,
    LogsApi,
    LspApi,
    ManagementApi,
    NotesApi,
    NotificationsApi,
    QueryApi,
    ReportsApi,
    StatisticsApi,
    UsersApi,
} from '@services/cradle/apis';
import { Configuration } from '@services/cradle/runtime';
import { ReactNode, useEffect, useMemo } from 'react';

interface ApiProviderProps {
    children: ReactNode;
}

/**
 * ApiProvider component - provides API instances to the application
 * Wraps components that need access to API clients
 * Automatically configures authentication based on AuthContext
 */
export function ApiProvider({ children }: ApiProviderProps) {
    const { basePath } = useAuthState();
    const { getAccessToken, isLoggedIn, setBasePath } = useAuthActions();

    const configuration = useMemo(() => {
        return new Configuration({
            basePath: basePath,
            accessToken: async () => {
                // Decide at call time, not memo time
                if (!isLoggedIn()) return '';
                return await getAccessToken();
            },
            // Note: Don't set Content-Type as a default header here.
            // Individual API methods set it as needed (e.g., 'application/json' for JSON requests).
            // For file uploads, the browser must set 'multipart/form-data' with the boundary automatically.
        });
    }, [basePath, getAccessToken, isLoggedIn]);

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
            reportsApi: new ReportsApi(configuration),
            statisticsApi: new StatisticsApi(configuration),
            usersApi: new UsersApi(configuration),
        };
    }, [configuration]);

    // Cancel and clear all queries when basePath changes (env switch)
    // This ensures stale data from the old basePath is cleared and in-flight requests are cancelled
    useEffect(() => {
        queryClient.cancelQueries();
        queryClient.clear();
        // Optional: force re-login on env switch
        // auth.logOut();
    }, [basePath]);

    return (
        <ApiContext.Provider value={{ ...apis, basePath: basePath, setBasePath }}>
            {children}
        </ApiContext.Provider>
    );
}
