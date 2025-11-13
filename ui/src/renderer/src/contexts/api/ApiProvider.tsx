import { createContext, useMemo, ReactNode } from 'react';
import useAuth from '@/hooks/auth/useAuth';
import {
    AccessApi,
    EntriesApi,
    FileTransferApi,
    FleetingNotesApi,
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
} from '@/services/cradle/apis';
import { Configuration } from '@/services/cradle/runtime';

interface ApiContextValue {
    accessApi: AccessApi;
    entriesApi: EntriesApi;
    fileTransferApi: FileTransferApi;
    fleetingNotesApi: FleetingNotesApi;
    intelioApi: IntelioApi;
    knowledgeGraphApi: KnowledgeGraphApi;
    logsApi: LogsApi;
    lspApi: LspApi;
    managementApi: ManagementApi;
    notesApi: NotesApi;
    notificationsApi: NotificationsApi;
    queryApi: QueryApi;
    reportsApi: ReportsApi;
    statisticsApi: StatisticsApi;
    usersApi: UsersApi;
    basePath: string;
    setBasePath: (path: string) => void;
}

/**
 * ApiContext - provides access to all API instances
 */
export const ApiContext = createContext<ApiContextValue | undefined>(undefined);

interface ApiProviderProps {
    children: ReactNode;
}

/**
 * ApiProvider component - provides API instances to the application
 * Wraps components that need access to API clients
 * Automatically configures authentication based on AuthContext
 */
export function ApiProvider({ children }: ApiProviderProps) {
    const { getAccessToken, isLoggedIn, tokenVersion, basePath, setBasePath } = useAuth();

    const configuration = useMemo(() => {
        return new Configuration({
            basePath: basePath,
            accessToken: isLoggedIn()
                ? async () => {
                      try {
                          const token = await getAccessToken();
                          return token;
                      } catch (error) {
                          console.error('Failed to get access token:', error);
                          return undefined;
                      }
                  }
                : undefined,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }, [tokenVersion, basePath, getAccessToken, isLoggedIn]);

    // Create API instances with the configuration
    const apis = useMemo(() => {
        return {
            accessApi: new AccessApi(configuration),
            entriesApi: new EntriesApi(configuration),
            fileTransferApi: new FileTransferApi(configuration),
            fleetingNotesApi: new FleetingNotesApi(configuration),
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

    return (
        <ApiContext.Provider value={{ ...apis, basePath, setBasePath }}>
            {children}
        </ApiContext.Provider>
    );
}
