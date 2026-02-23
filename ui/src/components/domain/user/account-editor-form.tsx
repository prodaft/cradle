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
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { UserRetrieve } from '@/services/cradle/models';
import SnippetList, {
    SnippetListRef,
} from '@components/base/snippet-list/snippet-list';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

interface AccountEditorFormProps {
    target?: string;
}

const schema = z.object({
    vimMode: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AccountEditorForm({ target = 'me' }: AccountEditorFormProps) {
    const { usersApi } = useApi();
    const queryClient = useQueryClient();
    const vimModeId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    const [noteTemplateDialogOpen, setNoteTemplateDialogOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');
    const [noteTemplateLoading, setNoteTemplateLoading] = useState(false);

    const { data: userData } = useQuery<UserRetrieve>({
        queryKey: queryKeys.users.detail(target),
        queryFn: () => usersApi.usersRetrieve({ userId: target }),
        enabled: !!target,
        meta: { suppressNotification: true },
    });

    const saveMutation = useMutation({
        mutationFn: async (payload: { vimMode?: boolean }) => {
            if (!userData?.id) return;
            await usersApi.usersUpdate({
                userId: userData.id,
                userUpdateRequest: payload as any,
            });
        },
        meta: { successMessage: 'Settings saved successfully' },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(target),
            });
        },
    });

    const fetchNoteTemplateMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await usersApi.usersDefaultNoteTemplateRetrieve({ userId });
        },
        meta: { suppressNotification: true },
    });

    const saveNoteTemplateMutation = useMutation({
        mutationFn: async ({
            userId,
            template,
        }: {
            userId: string;
            template: string;
        }) => {
            await usersApi.usersDefaultNoteTemplateCreate({
                userId,
                defaultNoteTemplateRequest: { template },
            });
        },
        meta: { successMessage: 'Note template saved successfully' },
    });

    const {
        reset,
        control,
        handleSubmit,
        formState: { isDirty },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { vimMode: false },
    });

    useEffect(() => {
        if (userData) {
            reset({ vimMode: userData.vimMode || false });
        }
    }, [userData, reset]);

    const handleSave = (data: FormData) => {
        saveMutation.mutate({ vimMode: data.vimMode });
    };

    const openNoteTemplateDialog = async () => {
        setNoteTemplateLoading(true);
        try {
            const res = await fetchNoteTemplateMutation.mutateAsync(target);
            setNoteTemplateContent(res.template || '');
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
                                name='vimMode'
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
                                {saveMutation.isPending
                                    ? 'Saving...'
                                    : 'Save Changes'}
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
                    const meKey = queryKeys.users.detail(target);
                    queryClient.setQueryData(meKey, (prevProfile: any) => ({
                        ...prevProfile,
                        defaultNoteTemplate: content,
                    }));
                    await saveNoteTemplateMutation.mutateAsync({
                        userId: target,
                        template: content,
                    });
                }}
            />
        </>
    );
}
