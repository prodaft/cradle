import { Field, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';

interface PasswordConfirmFieldProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
    label?: string;
    placeholder?: string;
}

export default function PasswordConfirmField({
    id,
    value,
    onChange,
    disabled = false,
    required = true,
    label = 'Current password',
    placeholder = 'Enter your password',
}: PasswordConfirmFieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <Field>
            <FieldLabel htmlFor={inputId}>
                {label}
                {required ? <span className='text-destructive'> *</span> : null}
            </FieldLabel>
            <InputGroup>
                <InputGroupInput
                    id={inputId}
                    name='confirm-password'
                    type={isRevealed ? 'text' : 'password'}
                    autoComplete='current-password'
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    required={required}
                />
                <InputGroupAddon align='inline-end'>
                    <InputGroupButton
                        type='button'
                        onClick={() => setIsRevealed(!isRevealed)}
                        aria-label={isRevealed ? 'Hide password' : 'Show password'}
                        title={isRevealed ? 'Hide password' : 'Show password'}
                    >
                        {isRevealed ? (
                            <EyeSlashIcon className='size-4' weight='bold' />
                        ) : (
                            <EyeIcon className='size-4' weight='bold' />
                        )}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}
