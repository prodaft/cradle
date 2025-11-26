import useApi from '@/hooks/api/useApi';
import { useState } from 'react';
import AlertBox from '../../../base/Alert/AlertBox';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

export default function EntriesManagement() {
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const { managementApi } = useApi();

    const handlePropagateAccessVectors = async () => {
        try {
            await managementApi.managementActionsCreate({
                actionName: 'propagateAccessVectors',
            });
            setAlert({
                show: true,
                message: 'Propagate Access Vectors action triggered successfully!',
                color: 'green',
            });
        } catch (error) {
            setAlert({
                show: true,
                message: 'Error occurred while propagating access vectors.',
                color: 'red',
            });
        }
    };

    const handleDeleteHangingArtifacts = async () => {
        try {
            const response = await managementApi.managementActionsCreate({
                actionName: 'deleteHangingArtifacts',
            });
            setAlert({
                show: true,
                message: response.message || 'Action completed successfully!',
                color: 'green',
            });
        } catch (error) {
            setAlert({
                show: true,
                message: 'Error occurred while deleting hanging artifacts.',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    Entry Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <div className='flex flex-col gap-4 mb-3'>
                        <button
                            type='button'
                            className='btn btn-outline'
                            onClick={handlePropagateAccessVectors}
                        >
                            Propagate Access Vectors
                        </button>
                    </div>

                    <div className='flex flex-col gap-4 mb-3'>
                        <button
                            type='button'
                            className='btn btn-outline'
                            onClick={handleDeleteHangingArtifacts}
                        >
                            Delete Hanging Artifacts
                        </button>
                    </div>
                    <AlertBox alert={alert} />
                </div>
            </div>
        </div>
    );
}
