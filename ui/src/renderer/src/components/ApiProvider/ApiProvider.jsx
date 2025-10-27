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
 * @returns {ApiProvider}
 * @constructor
 */
export default function ApiProvider({ children }) {
    const { getAccessToken, isLoggedIn } = useAuth();
    const [basePath, setBasePath] = useState(getBaseUrl());

    /**
     * Middleware: Convert URLSearchParams to JSON body
     */
    const bodyConverterMiddleware = {
        pre: (context) => {
            const isJsonRequest = context.init.headers['Content-Type'] === 'application/json';
            const hasFormData = context.init.body instanceof URLSearchParams;

            if (!isJsonRequest || !hasFormData) {
                return context;
            }

            // Convert form data to clean JSON object
            const jsonBody = {};
            for (const [key, value] of context.init.body.entries()) {
                if (value != null && value !== 'undefined') {
                    jsonBody[key] = value;
                }
            }

            return {
                ...context,
                init: {
                    ...context.init,
                    body: JSON.stringify(jsonBody),
                },
            };
        },
    };

    // Create configuration with authentication
    const configuration = useMemo(() => {
        return new Configuration({
            basePath: basePath,
            // Use getAccessToken which handles refresh automatically
            accessToken: isLoggedIn() ? getAccessToken : undefined,
            headers: {
                'Content-Type': 'application/json',
            },
            middleware: [bodyConverterMiddleware],
        });
    }, [getAccessToken, isLoggedIn, basePath]);

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
