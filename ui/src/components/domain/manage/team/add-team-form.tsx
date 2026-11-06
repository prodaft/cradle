import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { TeamFields, teamSchema, type TeamFormData } from './team-fields';

type Team = components['schemas']['Team'];

interface AddTeamFormProps {
    onAdd?: (team: Team) => void;
}

export default function AddTeamForm({ onAdd }: AddTeamFormProps) {
    const {
        handleSubmit,
        control,
        formState: { isSubmitting },
    } = useForm<TeamFormData>({
        resolver: zodResolver(teamSchema) as any,
        defaultValues: { name: '', description: '' },
    });

    const createTeam = useMutation({
        mutationFn: async (body: TeamFormData) => {
            const { data, error, response } = await fetchClient.POST('/teams/', {
                body,
            });
            if (error) throw { response, error };
            return data;
        },
        meta: { successMessage: 'Team created successfully' },
        onSuccess: (team) => onAdd?.(team),
    });

    const onSubmit = async (values: TeamFormData) => {
        try {
            await createTeam.mutateAsync(values);
        } catch {
            // errors/toasts handled by mutation meta; keep form responsive
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className='flex w-full min-h-0 flex-col gap-4'
        >
            <FieldGroup className='gap-4'>
                <TeamFields control={control} />
            </FieldGroup>
            <DialogFooter className='shrink-0 sm:justify-end'>
                <DialogClose
                    render={
                        <Button
                            type='button'
                            variant='outline'
                            disabled={isSubmitting}
                        />
                    }
                >
                    Cancel
                </DialogClose>
                <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Spinner />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Plus data-icon='inline-start' />
                            Create
                        </>
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}
