import { createContext, useMemo } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
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
} from '../../services/cradle/apis';
import { Configuration } from '../../services/cradle/runtime';

/**
 * ApiContext - provides access to all API instances
 * @type {React.Context<unknown>}
 */
export const ApiContext = createContext();

/**
 * ApiProvider component - provides API instances to the application
 * Wraps components that need access to API clients
 * Automatically configures authentication based on AuthContext
 *
 * @function ApiProvider
 * @param {Array<React.ReactElement>} children - the children components
 * @returns {ApiProvider}
 * @constructor
 */
export default function ApiProvider({ children }) {
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
    const apis = useMemo(
        () => {
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
            }
        },
        [configuration],
    );

    return (
        <ApiContext.Provider value={{ ...apis, basePath, setBasePath }}>
            {children}
        </ApiContext.Provider>
    );
}
