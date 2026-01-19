import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import useApi from '@/hooks/api/useApi';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

type AccessLevel = 'none' | 'read' | 'read-write';

interface AdminPanelPermissionCardProps {
    userId: string;
    text: string;
    entityId: number;
    accessLevel: AccessLevel;
    searchKey: string;
}

const ACCESS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'read', label: 'Read' },
    { value: 'read-write', label: 'Read-Write' },
];

/**
 * AdminPanelPermissionCard component - Displays and manages user permissions for an entity
 */
export default function AdminPanelPermissionCard({
    userId,
    text,
    entityId,
    accessLevel,
    searchKey,
}: AdminPanelPermissionCardProps) {
    const [currentAccess, setCurrentAccess] = useState<AccessLevel>(accessLevel);
    const { accessApi } = useApi();

    const updateAccessMutation = useMutation({
        mutationFn: async (accessType: AccessLevel) => {
            await accessApi.accessUserUpdate({
                userId: userId,
                entityId: entityId,
                accessRequest: { accessType },
            });
        },
        meta: {
            successMessage: 'Access updated successfully',
        },
        onSuccess: (_, accessType) => {
            setCurrentAccess(accessType as AccessLevel);
        },
    });

    const handleChange = (newAccess: string) => {
        const accessValue = newAccess as AccessLevel;
        if (currentAccess !== accessValue) {
            updateAccessMutation.mutate(accessValue);
        }
    };

    return (
        <div className='px-4 py-3'>
            <Field orientation='horizontal'>
                <FieldContent className='flex-1'>
                    <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                        {text}
                    </FieldLabel>
                    <FieldDescription className='text-sm'>
                        Entity access permissions
                    </FieldDescription>
                </FieldContent>
                <RadioGroup
                    value={currentAccess}
                    onValueChange={handleChange}
                    name={`access-${entityId}`}
                    className='flex-row gap-3'
                >
                    {ACCESS_OPTIONS.map((option) => {
                        const optionId = `access-${entityId}-${option.value}`;
                        return (
                            <div key={option.value} className='flex items-center gap-2'>
                                <RadioGroupItem value={option.value} id={optionId} />
                                <Label
                                    htmlFor={optionId}
                                    className='text-sm text-foreground cursor-pointer'
                                >
                                    {option.label}
                                </Label>
                            </div>
                        );
                    })}
                </RadioGroup>
            </Field>
        </div>
    );
}
