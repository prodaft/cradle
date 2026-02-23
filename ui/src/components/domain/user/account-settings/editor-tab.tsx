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
import { useId, useRef } from 'react';
import { Control, Controller } from 'react-hook-form';

interface EditorTabProps {
    control: Control<any>;
    target: string;
    noteTemplateLoading: boolean;
    onOpenNoteTemplate: () => void;
    savePending: boolean;
    isDirty: boolean;
}

export default function EditorTab({
    control,
    target,
    noteTemplateLoading,
    onOpenNoteTemplate,
    savePending,
    isDirty,
}: EditorTabProps) {
    const vimModeId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    return (
        <section id='editor'>
            <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex-1'>
                        <Label htmlFor={vimModeId} className='text-sm block mb-0.5'>
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
                            onClick={onOpenNoteTemplate}
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
                                Reusable text blocks you can insert with shortcuts
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-center'
                            onClick={() => {
                                snippetListRef.current?.handleAddSnippet();
                            }}
                        >
                            New Snippet
                        </Button>
                    </Field>
                </FieldGroup>
                <SnippetList ref={snippetListRef} userId={target} showTitle={false} />
                <div className='flex justify-end pt-2'>
                    <Button type='submit' disabled={savePending || !isDirty}>
                        {savePending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </section>
    );
}
