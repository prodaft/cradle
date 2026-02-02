import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { ArrowClockwiseIcon, HardDrivesIcon } from '@phosphor-icons/react';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GraphSettingsForm() {
    const { managementApi } = useApi();

    const refreshGraphMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName:
                    ManagementActionsCreateActionNameEnum.RefreshMaterializedGraph,
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Refresh Materialized Graph action triggered!');
        },
        onError: () => {
            toast.error('Failed to refresh materialized graph');
        },
    });

    const recalculatePositionsMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: 'recalculateNodePositions' as any,
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Re-calculate Node Positions action triggered!');
        },
        onError: () => {
            toast.error('Failed to re-calculate node positions');
        },
    });

    const handleRefreshMaterializedGraph = () => {
        refreshGraphMutation.mutate();
    };

    const handleRecalculateNodePositions = () => {
        recalculatePositionsMutation.mutate();
    };

    return (
        <div className='flex flex-col gap-6'>
            {/* Actions Section */}
            <div className='flex flex-col gap-4'>
                <h3 className='font-semibold text-base'>Actions</h3>
                <FieldGroup className='gap-4'>
                    <Field orientation='responsive'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Refresh Materialized Graph
                            </FieldLabel>
                            <FieldDescription>
                                Rebuild the graph database materialized view
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-start md:self-center'
                            onClick={handleRefreshMaterializedGraph}
                        >
                            <ArrowClockwiseIcon className='w-3.5 h-3.5' weight='bold' />
                            Refresh
                        </Button>
                    </Field>

                    <Separator />

                    <Field orientation='responsive'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Recalculate Node Positions
                            </FieldLabel>
                            <FieldDescription>
                                Recompute all node positions in the graph
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-start md:self-center'
                            onClick={handleRecalculateNodePositions}
                        >
                            <HardDrivesIcon className='w-3.5 h-3.5' weight='bold' />
                            Recalculate
                        </Button>
                    </Field>
                </FieldGroup>
            </div>
        </div>
    );
}
