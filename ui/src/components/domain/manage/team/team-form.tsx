import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { teamSchema, type TeamFormData } from './team-fields';

type Team = components['schemas']['Team'];

interface TeamFormProps {
    team: Team & { id: string };
}

export default function TeamForm({ team }: TeamFormProps) {
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const canManage = !!team.can_manage;

    const {
        control,
        handleSubmit,
        reset,
        formState: { isDirty, isSubmitting },
    } = useForm<TeamFormData>({
        resolver: zodResolver(teamSchema) as any,
        defaultValues: { name: team.name, description: team.description ?? '' },
    });

    useEffect(() => {
        reset({ name: team.name, description: team.description ?? '' });
    }, [team.name, team.description, reset]);

    const updateTeam = useMutation({
        mutationFn: async (body: TeamFormData) => {
            const { data, error, response } = await fetchClient.PATCH(
                '/teams/{team_id}/',
                { params: { path: { team_id: team.id } }, body },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            successMessage: 'Team updated successfully',
            invalidateQueries: [{ queryKey: queryKeys.teams.all }],
        },
        onSuccess: (saved) =>
            reset({ name: saved.name, description: saved.description ?? '' }),
    });

    const deleteTeam = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE('/teams/{team_id}/', {
                params: { path: { team_id: team.id } },
            });
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Team deleted',
            // Deleting a team drops its grants and clears ownership of its entities.
            invalidateQueries: [
                { queryKey: queryKeys.teams.all },
                { queryKey: ['get', '/entries/entities/{entity_id}/access/users/'] },
                { queryKey: ['get', '/users/{user_id}/access/'] },
                { queryKey: ['get', '/entries/entities/{entity_id}/'] },
            ],
        },
        onSuccess: () => router.navigate({ to: '/manage/teams' as any }),
    });

    const save = handleSubmit(async (values) => {
        try {
            await updateTeam.mutateAsync(values);
        } catch {
            // errors/toasts handled by mutation meta; keep form responsive
        }
    });

    return (
        <>
            {canManage && (
                <SettingsHeaderActionsPortal>
                    <SettingsSaveButton
                        isDirty={isDirty}
                        saving={isSubmitting}
                        onSave={save}
                    />
                </SettingsHeaderActionsPortal>
            )}
            <form onSubmit={save}>
                <FieldGroup className='gap-4'>
                    <Controller
                        name='name'
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field
                                orientation='responsive'
                                data-invalid={fieldState.invalid}
                            >
                                <FieldContent className='flex-1'>
                                    <FieldLabel
                                        htmlFor='name'
                                        className='text-sm block'
                                    >
                                        Name
                                    </FieldLabel>
                                    <FieldDescription>
                                        Unique name for this team
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError className='text-sm mt-1'>
                                            {fieldState.error?.message}
                                        </FieldError>
                                    )}
                                </FieldContent>
                                <div className='w-64 shrink-0 self-start md:self-center'>
                                    <Input
                                        {...field}
                                        id='name'
                                        placeholder='Name'
                                        disabled={!canManage}
                                        aria-invalid={fieldState.invalid}
                                    />
                                </div>
                            </Field>
                        )}
                    />

                    <Separator />

                    <Controller
                        name='description'
                        control={control}
                        render={({ field }) => (
                            <Field>
                                <FieldContent>
                                    <FieldLabel
                                        htmlFor='description'
                                        className='text-sm block mb-0.5'
                                    >
                                        Description
                                    </FieldLabel>
                                    <FieldDescription className='text-sm mb-2'>
                                        What does this team work on?
                                    </FieldDescription>
                                </FieldContent>
                                <Textarea
                                    {...field}
                                    id='description'
                                    placeholder='Description'
                                    rows={4}
                                    disabled={!canManage}
                                />
                            </Field>
                        )}
                    />

                    {isAdmin && (
                        <>
                            <Separator />

                            <Field orientation='responsive'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel className='text-sm block'>
                                        Delete
                                    </FieldLabel>
                                    <FieldDescription>
                                        Members lose the access they had through this
                                        team. Their direct grants are kept, and entities
                                        this team owned become unowned.
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    type='button'
                                    variant='destructive'
                                    size='sm'
                                    className='self-start md:self-center'
                                    onClick={() => setIsDeleteOpen(true)}
                                >
                                    Delete
                                </Button>
                            </Field>
                        </>
                    )}
                </FieldGroup>
            </form>
            {isAdmin && (
                <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <AlertDialogContent className='sm:max-w-md'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This removes the team, its memberships and its entity
                                access. It cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel variant='outline' size='sm'>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant='destructive'
                                size='sm'
                                disabled={deleteTeam.isPending}
                                onClick={() => deleteTeam.mutate()}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
