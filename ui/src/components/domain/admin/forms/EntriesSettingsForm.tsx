import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/use-api';
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
    });

    const handlePropagateAccessVectors = () => {
        propagateAccessMutation.mutate();
    };

    const handleDeleteHangingArtifacts = () => {
        deleteHangingArtifactsMutation.mutate();
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
                                Propagate Access Vectors
                            </FieldLabel>
                            <FieldDescription>
                                Update access permissions across all entries
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-start md:self-center'
                            onClick={handlePropagateAccessVectors}
                        >
                            <HardDrivesIcon className='w-3.5 h-3.5' weight='bold' />
                            Propagate
                        </Button>
                    </Field>

                    <Separator />

                    <Field orientation='responsive'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Delete Hanging Artifacts
                            </FieldLabel>
                            <FieldDescription>
                                Remove artifacts that are no longer referenced
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='destructive'
                            size='sm'
                            className='self-start md:self-center'
                            onClick={handleDeleteHangingArtifacts}
                        >
                            <TrashIcon className='w-3.5 h-3.5' weight='bold' />
                            Delete
                        </Button>
                    </Field>
                </FieldGroup>
            </div>
        </div>
    );
}
