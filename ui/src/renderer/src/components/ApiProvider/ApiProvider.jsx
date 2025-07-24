import { createContext, useMemo } from 'react';
import { Configuration } from '../../services/cradle/runtime';
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
import useAuth from '../../hooks/useAuth/useAuth';

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
 * @param {string} [basePath] - optional override for API base path
 * @returns {ApiProvider}
 * @constructor
 */
export default function ApiProvider({ children, basePath }) {
    const { access, isAuthenticated } = useAuth();

    // Create configuration with authentication
    const configuration = useMemo(() => {
        const config = new Configuration({
            basePath:
                basePath || process.env.VITE_API_BASE_URL || 'http://localhost:8000',
            accessToken: isAuthenticated() ? () => access : undefined,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return config;
    }, [access, isAuthenticated, basePath]);

    // Create API instances with the configuration
    const apis = useMemo(
        () => ({
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
        }),
        [configuration],
    );

    return <ApiContext.Provider value={apis}>{children}</ApiContext.Provider>;
}
