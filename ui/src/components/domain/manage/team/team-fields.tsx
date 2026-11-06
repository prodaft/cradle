import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupInput,
    InputGroupTextarea,
} from '@/components/ui/input-group';
import { type Control, Controller } from 'react-hook-form';
import * as z from 'zod';

export const teamSchema = z.object({
    name: z.string().trim().min(1, { error: 'Name is required' }).max(255),
    description: z.string().default(''),
});

export type TeamFormData = z.infer<typeof teamSchema>;

interface TeamFieldsProps {
    control: Control<TeamFormData>;
}

/** Name and description inputs for the create team dialog. */
export function TeamFields({ control }: TeamFieldsProps) {
    return (
        <>
            <Controller
                name='name'
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldContent>
                            <FieldLabel htmlFor={field.name}>
                                Name
                                <span className='text-destructive ml-1'>*</span>
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    id={field.name}
                                    placeholder='Name'
                                    aria-invalid={fieldState.invalid}
                                    required
                                />
                            </InputGroup>
                            <FieldDescription>
                                Unique name for this team
                            </FieldDescription>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </FieldContent>
                    </Field>
                )}
            />
            <Controller
                name='description'
                control={control}
                render={({ field }) => (
                    <Field>
                        <FieldContent>
                            <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                            <InputGroup>
                                <InputGroupTextarea
                                    {...field}
                                    id={field.name}
                                    placeholder='What does this team work on?'
                                />
                            </InputGroup>
                        </FieldContent>
                    </Field>
                )}
            />
        </>
    );
}
