import { createContext, useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { getBaseUrl } from '../../services/configService/configService';
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
 * @param {string} [basePath] - optional override for API base path
 * @returns {ApiProvider}
 * @constructor
 */
export default function ApiProvider({ children }) {
    const { access, isAuthenticated } = useAuth();
    const [basePath, setBasePath] = useState(getBaseUrl());

    // Create configuration with authentication
    const configuration = useMemo(() => {
        const config = new Configuration({
            basePath: basePath,
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

    return (
        <ApiContext.Provider value={{ ...apis, basePath, setBasePath }}>
            {children}
        </ApiContext.Provider>
    );
}
