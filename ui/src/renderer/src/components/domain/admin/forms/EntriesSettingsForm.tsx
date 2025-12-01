import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { useState } from 'react';
import { FormAlert, FormAlertState } from '../../../forms';

export default function EntriesManagement() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();
    const [alert, setAlert] = useState<FormAlertState>({ type: null, message: '' });

    const handlePropagateAccessVectors = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'propagateAccessVectors',
                    }),
                { suppressNotification: true },
            );
            setAlert({
                type: 'success',
                message: 'Propagate Access Vectors action triggered successfully!',
            });
        } catch {
            setAlert({
                type: 'error',
                message: 'Error occurred while propagating access vectors.',
            });
        }
    };

    const handleDeleteHangingArtifacts = async () => {
        try {
            const response = await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'deleteHangingArtifacts',
                    }),
                { suppressNotification: true },
            );
            setAlert({
                type: 'success',
                message: (response as any)?.message || 'Action completed successfully!',
            });
        } catch {
            setAlert({
                type: 'error',
                message: 'Error occurred while deleting hanging artifacts.',
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-xl px-4">
                <h1 className="text-center text-xl font-bold text-primary mb-4">
                    Entry Settings
                </h1>
                <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md">
                    <FormAlert
                        alert={alert}
                        onDismiss={() => setAlert({ type: null, message: '' })}
                    />
                    <div className="flex flex-col gap-4">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handlePropagateAccessVectors}
                        >
                            Propagate Access Vectors
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleDeleteHangingArtifacts}
                        >
                            Delete Hanging Artifacts
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
