import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { ArrowClockwiseIcon, HardDrivesIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GraphSettingsForm() {
    const refreshGraphMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST(
                '/management/actions/{action_name}',
                { params: { path: { action_name: 'refreshMaterializedGraph' } } },
            );
            if (error) throw { response };
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Refresh Materialized Graph action triggered!');
        },
    });

    const recalculatePositionsMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST(
                '/management/actions/{action_name}',
                {
                    params: {
                        path: { action_name: 'recalculate_node_positions' as any },
                    },
                },
            );
            if (error) throw { response };
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Re-calculate Node Positions action triggered!');
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
