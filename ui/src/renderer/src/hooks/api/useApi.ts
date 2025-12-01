/**
 * Hook for accessing API client instances
 */

import type {
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
} from '@services/cradle/apis';
import { createContext, useContext } from 'react';

/**
 * API context value containing all API instances
 */
export interface ApiContextValue {
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

/**
 * Hook to use the ApiContext
 * Provides access to all configured API instances
 * Must be used inside a component wrapped in ApiProvider
 *
 * @returns Object containing all API instances
 */
export const useApi = (): ApiContextValue => {
    const context = useContext(ApiContext);

    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }

    return context;
};

export default useApi;
