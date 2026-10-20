import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { DEFAULT_PRESET, PRESET_THEMES } from '@/utils/themes';
import {} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AccountAppearanceFormProps {
    target?: string;
}

export default function AccountAppearanceForm({
    target = 'me',
}: AccountAppearanceFormProps) {
    const [selectedThemeType, setSelectedThemeType] = useState<string>('dark');
    const [customThemeJSON, setCustomThemeJSON] = useState<string>('');
    const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<Record<string, any> | null>(null);

    const { data: targetUser } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        { enabled: !!target, meta: { suppressNotification: true } },
    );

    const saveTheme = useMutation({
        mutationFn: async (theme: Record<string, any>) => {
            if (!targetUser?.id) return;
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: targetUser.id } },
                body: { theme },
            });
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Settings saved successfully',
            invalidateQueries: [{ queryKey: queryKeys.users.apiDetails() }],
        },
        onSuccess: () => setPendingTheme(null),
    });

    useEffect(() => {
        if (!targetUser?.theme) return;

        const theme = targetUser.theme as Record<string, any>;

        const themeName = theme?.name;
        if (themeName && themeName !== 'custom') {
            const matchedPreset = PRESET_THEMES.find(
                (preset) => preset.id === themeName,
            );
            if (matchedPreset) {
                setSelectedThemeType(themeName);
                setCustomThemeJSON('');
            } else {
                setSelectedThemeType('custom');
                const { name: _name, ...rest } = theme;
                setCustomThemeJSON(JSON.stringify(rest, null, 2));
            }
        } else {
            setSelectedThemeType('custom');
            const { name: _name, ...rest } = theme;
            setCustomThemeJSON(
                JSON.stringify(Object.keys(rest).length > 0 ? rest : theme, null, 2),
            );
        }
    }, [targetUser]);

    const changeThemeType = (themeType: string) => {
        setSelectedThemeType(themeType);

        if (themeType === 'custom') {
            const currentTheme = targetUser?.theme || DEFAULT_PRESET.theme;
            const { name: _name, ...rest } = currentTheme as any;
            setCustomThemeJSON(JSON.stringify(rest, null, 2));
            setPendingTheme(null);
        } else {
            const preset = PRESET_THEMES.find((p) => p.id === themeType);
            if (preset) {
                const presetTheme: any = preset.theme;
                const themeWithName =
                    presetTheme &&
                    typeof presetTheme === 'object' &&
                    !Array.isArray(presetTheme)
                        ? 'name' in presetTheme
                            ? presetTheme
                            : { name: preset.id, ...presetTheme }
                        : { name: preset.id };

                setPendingTheme(themeWithName);
            }
        }
    };

    const applyCustom = () => {
        try {
            const parsed = JSON.parse(customThemeJSON);
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                Array.isArray(parsed)
            ) {
                toast.error('Theme must be a JSON object.');
                return;
            }
            const themeWithName = { name: 'custom', ...parsed };
            setPendingTheme(themeWithName);
        } catch {
            toast.error('Invalid JSON format');
        }
    };

    const save = () => {
        if (!pendingTheme) {
            toast.info('No changes to save');
            return;
        }
        saveTheme.mutate(pendingTheme);
    };

    return (
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={!!pendingTheme}
                    saving={saveTheme.isPending}
                    onSave={save}
                />
            </SettingsHeaderActionsPortal>
            <section id='appearance'>
                <div className='flex flex-col gap-4'>
                    <FieldGroup className='gap-4'>
                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block mb-0.5'>
                                    Theme
                                </FieldLabel>
                                <FieldDescription>
                                    Select a color theme for the interface
                                </FieldDescription>
                            </FieldContent>
                            <Popover
                                open={isThemePickerOpen}
                                onOpenChange={setIsThemePickerOpen}
                            >
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant='outline'
                                            role='combobox'
                                            aria-expanded={isThemePickerOpen}
                                            className='w-full sm:w-64 justify-between self-center'
                                        />
                                    }
                                >
                                    <span className='truncate'>
                                        {selectedThemeType === 'custom'
                                            ? 'Custom'
                                            : PRESET_THEMES.find(
                                                  (p) => p.id === selectedThemeType,
                                              )?.label || 'Select theme...'}
                                    </span>
                                    <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
                                </PopoverTrigger>
                                <PopoverContent
                                    className='w-(--anchor-width) p-0'
                                    align='start'
                                >
                                    <Command>
                                        <CommandInput placeholder='Search themes...' />
                                        <CommandList>
                                            <CommandEmpty>
                                                No themes found.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {PRESET_THEMES.map((preset) => (
                                                    <CommandItem
                                                        key={preset.id}
                                                        value={preset.label}
                                                        onSelect={() => {
                                                            changeThemeType(preset.id);
                                                            setIsThemePickerOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 size-4',
                                                                selectedThemeType ===
                                                                    preset.id
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {preset.label}
                                                    </CommandItem>
                                                ))}
                                                <CommandItem
                                                    value='Custom'
                                                    onSelect={() => {
                                                        changeThemeType('custom');
                                                        setIsThemePickerOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 size-4',
                                                            selectedThemeType ===
                                                                'custom'
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    Custom
                                                </CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </Field>

                        {selectedThemeType === 'custom' && (
                            <Field className='space-y-2'>
                                <FieldLabel
                                    htmlFor='custom-theme-json'
                                    className='text-sm block mb-0.5'
                                >
                                    Custom Theme JSON
                                </FieldLabel>
                                <FieldDescription>
                                    Provide a JSON object with CSS variable values.
                                </FieldDescription>
                                <Textarea
                                    id='custom-theme-json'
                                    rows={10}
                                    className='font-mono text-xs'
                                    placeholder='{"--background":"oklch(0.145 0 0)","--foreground":"oklch(0.985 0 0)"}'
                                    value={customThemeJSON}
                                    onChange={(e) => setCustomThemeJSON(e.target.value)}
                                />
                                <div className='flex justify-end'>
                                    <Button type='button' onClick={applyCustom}>
                                        Apply Custom Theme
                                    </Button>
                                </div>
                            </Field>
                        )}
                    </FieldGroup>
                </div>
            </section>
        </>
    );
}
