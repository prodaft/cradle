import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import {} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useId } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

const searchSettingsSchema = z.object({
    revealRestrictedMatches: z.boolean(),
});

type SearchSettingsFormData = z.infer<typeof searchSettingsSchema>;

const SEARCH_SETTINGS_DEFAULTS: SearchSettingsFormData = {
    revealRestrictedMatches: false,
};

interface SearchSettingsApi {
    search?: {
        reveal_restricted_matches?: boolean;
    };
}

function getSearchSettingsFromApi(
    settings: SearchSettingsApi | null | undefined,
): SearchSettingsFormData | null {
    if (!settings?.search) return null;
    return {
        revealRestrictedMatches: settings.search.reveal_restricted_matches ?? false,
    };
}

export default function SearchSettingsForm() {
    const formId = useId();

    const {
        handleSubmit,
        reset,
        control,
        formState: { isDirty, isSubmitting },
    } = useForm<SearchSettingsFormData>({
        resolver: zodResolver(searchSettingsSchema),
        defaultValues: SEARCH_SETTINGS_DEFAULTS,
    });

    const { data: settings, isPending } = useQuery({
        queryKey: queryKeys.management.settings(),
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/management/settings/',
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const saveSettings = useMutation({
        mutationFn: async (values: SearchSettingsFormData) => {
            const { error, response } = await fetchClient.PATCH(
                '/management/settings/',
                {
                    body: {
                        search: {
                            reveal_restricted_matches: values.revealRestrictedMatches,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.management.settings() }],
            successMessage: 'Search settings updated successfully!',
        },
        onSuccess: (_, variables) => {
            reset(variables);
        },
    });

    useEffect(() => {
        const values = getSearchSettingsFromApi(settings);
        if (!values) return;
        reset(values);
    }, [settings, reset]);

    const onSubmit: SubmitHandler<SearchSettingsFormData> = async (values) => {
        try {
            await saveSettings.mutateAsync(values);
        } catch (_error) {
            // Error already handled by mutation
        }
    };

    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={isDirty}
                    saving={isSubmitting}
                    form={formId}
                />
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Results</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='revealRestrictedMatches'
                                control={control}
                                render={({ field }) => (
                                    <Field orientation='responsive'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='revealRestrictedMatches'
                                                className='text-sm block mb-0.5'
                                            >
                                                Reveal Restricted Notes
                                            </FieldLabel>
                                            <FieldDescription>
                                                Note search also lists matching
                                                published notes the user cannot access,
                                                without showing their content
                                            </FieldDescription>
                                        </FieldContent>
                                        <Switch
                                            id='revealRestrictedMatches'
                                            name={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='self-start md:self-center'
                                        />
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>
                </div>
            </form>
        </>
    );
}
