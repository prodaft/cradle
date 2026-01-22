import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { HardDrivesIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EntriesManagement() {
    const { managementApi } = useApi();

    const propagateAccessMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: 'propagateAccessVectors',
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Propagate Access Vectors action triggered successfully!');
        },
        onError: () => {
            toast.error('Error occurred while propagating access vectors.');
        },
    });

    const deleteHangingArtifactsMutation = useMutation({
        mutationFn: async () => {
            const response = await managementApi.managementActionsCreate({
                actionName: 'deleteHangingArtifacts',
            });
            return response;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (response) => {
            toast.success(
                (response as any)?.message || 'Action completed successfully!',
            );
        },
        onError: () => {
            toast.error('Error occurred while deleting hanging artifacts.');
        },
    });

    const handlePropagateAccessVectors = () => {
        propagateAccessMutation.mutate();
    };

    const handleDeleteHangingArtifacts = () => {
        deleteHangingArtifactsMutation.mutate();
    };

    return (
        <div className='w-full h-full'>
            <div className='w-full'>
                {/* Actions Section */}
                <section id='actions'>
                    <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                        Actions
                    </h2>
                    <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                        Maintenance operations for entries and artifacts
                    </p>

                    <div className='space-y-4'>
                        <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                            <CardContent className='px-4 py-1'>
                                <Field orientation='horizontal' className='py-2'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                            Propagate Access Vectors
                                        </FieldLabel>
                                        <FieldDescription className='text-sm'>
                                            Update access permissions across all entries
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='self-center'
                                        onClick={handlePropagateAccessVectors}
                                    >
                                        <HardDrivesIcon className='w-3.5 h-3.5' weight="bold" />
                                        Propagate
                                    </Button>
                                </Field>

                                <Separator />

                                <Field orientation='horizontal' className='py-2'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                            Delete Hanging Artifacts
                                        </FieldLabel>
                                        <FieldDescription className='text-sm'>
                                            Remove artifacts that are no longer
                                            referenced
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='destructive'
                                        size='sm'
                                        className='self-center'
                                        onClick={handleDeleteHangingArtifacts}
                                    >
                                        <TrashIcon className='w-3.5 h-3.5' weight="bold" />
                                        Delete
                                    </Button>
                                </Field>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </div>
    );
}
