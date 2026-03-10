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
import { Switch } from '@/components/ui/switch';
import SnippetList, {
    SnippetListRef,
} from '@components/base/snippet-list/snippet-list';
import { zodResolver } from '@hookform/resolvers/zod';
import { $api } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

type UserRetrieve = components['schemas']['UserRetrieve'];

interface AccountEditorFormProps {
    target?: string;
}

const schema = z.object({
    vim_mode: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AccountEditorForm({ target = 'me' }: AccountEditorFormProps) {
    const queryClient = useQueryClient();
    const vimModeId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    const [noteTemplateDialogOpen, setNoteTemplateDialogOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');
    const [noteTemplateLoading, setNoteTemplateLoading] = useState(false);

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

    const fetchNoteTemplateMutation = $api.useMutation(
        'get',
        '/users/{user_id}/default-note-template/',
        {
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

    const openNoteTemplateDialog = async () => {
        setNoteTemplateLoading(true);
        try {
            const res = await fetchNoteTemplateMutation.mutateAsync({
                params: {
                    path: {
                        user_id: target,
                    },
                },
            });
            const template = (res as Record<string, unknown>).template as
                | string
                | undefined;
            setNoteTemplateContent(template || '');
            setNoteTemplateDialogOpen(true);
        } finally {
            setNoteTemplateLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(handleSave)}>
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
                                    disabled={noteTemplateLoading}
                                >
                                    {noteTemplateLoading ? 'Loading...' : 'Edit'}
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
                        <div className='flex justify-end pt-2'>
                            <Button
                                type='submit'
                                disabled={saveMutation.isPending || !isDirty}
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </section>
            </form>

            <MarkdownEditorDialog
                open={noteTemplateDialogOpen}
                onOpenChange={setNoteTemplateDialogOpen}
                title='Default Note Template'
                titleEditable={false}
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
