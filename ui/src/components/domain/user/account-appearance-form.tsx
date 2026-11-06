import { SelectContent } from '@/components/custom/select';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';

const THEME_OPTIONS = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

export default function AccountAppearanceForm() {
    const { theme, setTheme } = useTheme();

    return (
        <section id='appearance'>
            <FieldGroup className='gap-4'>
                <Field orientation='horizontal'>
                    <FieldContent>
                        <FieldLabel className='text-sm block mb-0.5'>Theme</FieldLabel>
                        <FieldDescription>
                            Light, dark, or follow your system setting
                        </FieldDescription>
                    </FieldContent>
                    <Select
                        items={THEME_OPTIONS}
                        value={theme ?? 'dark'}
                        onValueChange={(value) => value !== null && setTheme(value)}
                    >
                        <SelectTrigger className='w-full sm:w-64 self-center'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {THEME_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FieldGroup>
        </section>
    );
}
