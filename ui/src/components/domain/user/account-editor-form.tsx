import MarkdownEditorDialog from '@/components/base/markdown-editor-dialog/markdown-editor-dialog';
import { SettingsHeaderActionsPortal } from '@/components/base/settings-header-actions/settings-header-actions';
import SnippetList, {
    SnippetListRef,
} from '@/components/base/snippet-list/snippet-list';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

interface AccountEditorFormProps {
    target?: string;
}

const schema = z.object({
    vim_mode: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const EDITOR_DEFAULTS: FormData = { vim_mode: false };

export default function AccountEditorForm({ target = 'me' }: AccountEditorFormProps) {
    const queryClient = useQueryClient();
    const vimModeId = useId();
    const formId = useId();
    const noteTemplateActionId = useId();
    const noteSnippetsActionId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');

    const { data: userSettings } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        {
            enabled: !!target,
            meta: { suppressNotification: true },
        },
    );

    const saveSettings = $api.useMutation('patch', '/users/{user_id}/', {
        meta: { successMessage: 'Settings saved successfully' },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['get', '/users/{user_id}/'],
            });
        },
    });

    const { refetch: refetchNoteTemplate, isFetching: isTemplateFetching } =
        $api.useQuery(
            'get',
            '/users/{user_id}/default-note-template/',
            { params: { path: { user_id: target } } },
            {
                enabled: false,
                meta: { suppressNotification: true },
            },
        );

    const saveNoteTemplate = $api.useMutation(
        'patch',
        '/users/{user_id}/default-note-template/',
        {
            meta: { successMessage: 'Note template saved successfully' },
        },
    );

    const {
        reset,
        control,
        handleSubmit,
        watch,
        formState: { isDirty },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { vim_mode: false },
    });

    useEffect(() => {
        if (userSettings) {
            reset({ vim_mode: userSettings.vim_mode || false });
        }
    }, [userSettings, reset]);

    const save = (values: FormData) => {
        saveSettings.mutate({
            params: {
                path: {
                    user_id: target,
                },
            },
            body: {
                vim_mode: values.vim_mode,
            },
        });
    };

    const revert = () => {
        if (userSettings) reset({ vim_mode: userSettings.vim_mode || false });
    };
    const resetToDefaults = () => reset(EDITOR_DEFAULTS, { keepDefaultValues: true });
    const isAtDefault = watch('vim_mode') === EDITOR_DEFAULTS.vim_mode;

    const openNoteTemplateDialog = async () => {
        const { data: noteTemplate, error } = await refetchNoteTemplate();
        if (error) return;
        setNoteTemplateContent(noteTemplate?.template ?? '');
        setIsTemplateOpen(true);
    };

    return (
        <>
            <SettingsHeaderActionsPortal>
                <div className='flex items-center gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={!isDirty}
                        onClick={revert}
                        title='Revert'
                    >
                        <ArrowCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={isAtDefault}
                        onClick={resetToDefaults}
                        title='Default'
                    >
                        <ClockCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='submit'
                        form={formId}
                        variant='default'
                        size='icon'
                        disabled={saveSettings.isPending || !isDirty}
                        title='Save Settings'
                    >
                        {saveSettings.isPending ? (
                            <Spinner className='size-4' />
                        ) : (
                            <FloppyDiskIcon className='size-4' weight='bold' />
                        )}
                    </Button>
                </div>
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleSubmit(save)}>
                <section id='editor'>
                    <div className='flex flex-col gap-4'>
                        <div className='flex items-center justify-between gap-4'>
                            <div className='flex-1'>
                                <Label
                                    htmlFor={vimModeId}
                                    className='text-sm block mb-0.5'
                                >
                                    Vim Mode
                                </Label>
                                <p className='text-sm text-muted-foreground'>
                                    Use Vim keybindings in the markdown editor
                                </p>
                            </div>
                            <Controller
                                name='vim_mode'
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id={vimModeId}
                                        name={field.name}
                                        data-testid='vim-toggle'
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>

                        <Separator />

                        <FieldGroup className='gap-4'>
                            <Field orientation='horizontal' className='gap-2'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel
                                        className='text-sm block mb-0.5'
                                        htmlFor={noteTemplateActionId}
                                    >
                                        Note Template
                                    </FieldLabel>
                                    <FieldDescription>
                                        Preset structure for new notes you create
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    id={noteTemplateActionId}
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-center'
                                    onClick={openNoteTemplateDialog}
                                    disabled={isTemplateFetching}
                                >
                                    {isTemplateFetching ? (
                                        <Spinner className='size-4' />
                                    ) : null}
                                    Edit
                                </Button>
                            </Field>

                            <Separator />

                            <Field orientation='horizontal' className='gap-2'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel
                                        className='text-sm block mb-0.5'
                                        htmlFor={noteSnippetsActionId}
                                    >
                                        Note Snippets
                                    </FieldLabel>
                                    <FieldDescription>
                                        Reusable text blocks you can insert with
                                        shortcuts
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    id={noteSnippetsActionId}
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-center'
                                    onClick={() =>
                                        snippetListRef.current?.handleAddSnippet()
                                    }
                                >
                                    New Snippet
                                </Button>
                            </Field>
                        </FieldGroup>
                        <SnippetList
                            ref={snippetListRef}
                            userId={target}
                            showTitle={false}
                        />
                    </div>
                </section>
            </form>

            <MarkdownEditorDialog
                open={isTemplateOpen}
                onOpenChange={setIsTemplateOpen}
                title='Note Template'
                titleEditable={false}
                description='Edit the markdown template used for new notes.'
                initialContent={noteTemplateContent}
                helpText='This markdown template will be used as the starting content for new notes you create.'
                onConfirm={async (content) => {
                    await saveNoteTemplate.mutateAsync({
                        params: {
                            path: {
                                user_id: target,
                            },
                        },
                        body: {
                            template: content,
                        },
                    });
                }}
            />
        </>
    );
}
