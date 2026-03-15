import MarkdownEditorDialog from '@/components/dialogs/base/markdown-editor-dialog';
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
import SnippetList, {
    SnippetListRef,
} from '@components/base/snippet-list/snippet-list';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    const snippetListRef = useRef<SnippetListRef>(null);

    const [noteTemplateDialogOpen, setNoteTemplateDialogOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        {
            enabled: !!target,
            meta: { suppressNotification: true },
        },
    );

    const saveMutation = $api.useMutation('patch', '/users/{user_id}/', {
        meta: { successMessage: 'Settings saved successfully' },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['get', '/users/{user_id}/'],
            });
        },
    });

    const noteTemplateQuery = $api.useQuery(
        'get',
        '/users/{user_id}/default-note-template/',
        { params: { path: { user_id: target } } },
        {
            enabled: false,
            meta: { suppressNotification: true },
        },
    );

    const saveNoteTemplateMutation = $api.useMutation(
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
        if (userData) {
            reset({ vim_mode: userData.vim_mode || false });
        }
    }, [userData, reset]);

    const handleSave = (data: FormData) => {
        saveMutation.mutate({
            params: {
                path: {
                    user_id: target,
                },
            },
            body: {
                vim_mode: data.vim_mode,
            },
        });
    };

    const headerContainer =
        typeof document !== 'undefined'
            ? document.getElementById('settings-header-actions')
            : null;

    const handleRevert = () => {
        if (userData) reset({ vim_mode: userData.vim_mode || false });
    };
    const handleDefault = () =>
        reset(EDITOR_DEFAULTS, { keepDefaultValues: true });
    const isAtDefault = watch('vim_mode') === EDITOR_DEFAULTS.vim_mode;

    const openNoteTemplateDialog = async () => {
        const { data, error } = await noteTemplateQuery.refetch();
        if (error) return;
        setNoteTemplateContent(data?.template ?? '');
        setNoteTemplateDialogOpen(true);
    };

    return (
        <>
            {headerContainer &&
                createPortal(
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!isDirty}
                            onClick={handleRevert}
                            title='Revert'
                        >
                            <ArrowCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={isAtDefault}
                            onClick={handleDefault}
                            title='Default'
                        >
                            <ClockCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='submit'
                            form='account-editor-form'
                            variant='default'
                            size='icon'
                            disabled={saveMutation.isPending || !isDirty}
                            title='Save Settings'
                        >
                            {saveMutation.isPending ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>,
                    headerContainer,
                )}
            <form id='account-editor-form' onSubmit={handleSubmit(handleSave)}>
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
                                    <FieldLabel className='text-sm block mb-0.5'>
                                        Note Template
                                    </FieldLabel>
                                    <FieldDescription>
                                        Preset structure for new notes you create
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-center'
                                    onClick={openNoteTemplateDialog}
                                    disabled={noteTemplateQuery.isFetching}
                                >
                                    {noteTemplateQuery.isFetching
                                        ? 'Loading...'
                                        : 'Edit'}
                                </Button>
                            </Field>

                            <Separator />

                            <Field orientation='horizontal' className='gap-2'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel className='text-sm block mb-0.5'>
                                        Note Snippets
                                    </FieldLabel>
                                    <FieldDescription>
                                        Reusable text blocks you can insert with
                                        shortcuts
                                    </FieldDescription>
                                </FieldContent>
                                <Button
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
                open={noteTemplateDialogOpen}
                onOpenChange={setNoteTemplateDialogOpen}
                title='Note Template'
                titleEditable={false}
                description='Edit the markdown template used for new notes.'
                initialContent={noteTemplateContent}
                helpText='This markdown template will be used as the starting content for new notes you create.'
                onConfirm={async (content) => {
                    await saveNoteTemplateMutation.mutateAsync({
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
