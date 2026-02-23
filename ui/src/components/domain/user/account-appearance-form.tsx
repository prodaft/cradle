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
import { useTheme } from '@/contexts/ui/theme-context';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { UserRetrieve } from '@/services/cradle/models';
import { PRESET_THEMES } from '@/utils/themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AccountAppearanceFormProps {
    target?: string;
}

export default function AccountAppearanceForm({
    target = 'me',
}: AccountAppearanceFormProps) {
    const { usersApi } = useApi();
    const queryClient = useQueryClient();
    const { setTheme } = useTheme();

    const [selectedThemeType, setSelectedThemeType] = useState<string>('dark');
    const [customThemeJSON, setCustomThemeJSON] = useState<string>('');
    const [themePopoverOpen, setThemePopoverOpen] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<Record<string, any> | null>(
        null,
    );

    const { data: userData } = useQuery<UserRetrieve>({
        queryKey: queryKeys.users.detail(target),
        queryFn: () => usersApi.usersRetrieve({ userId: target }),
        enabled: !!target,
        meta: { suppressNotification: true },
    });

    const saveMutation = useMutation({
        mutationFn: async (theme: Record<string, any>) => {
            if (!userData?.id) return;
            await usersApi.usersUpdate({
                userId: userData.id,
                userUpdateRequest: { theme } as any,
            });
        },
        meta: { successMessage: 'Settings saved successfully' },
        onSuccess: () => {
            setPendingTheme(null);
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(target),
            });
        },
    });

    useEffect(() => {
        if (!userData?.theme) return;

        const themeName = (userData.theme as any)?.name;
        if (themeName && themeName !== 'custom') {
            const matchedPreset = PRESET_THEMES.find(
                (preset) => preset.id === themeName,
            );
            if (matchedPreset) {
                setSelectedThemeType(themeName);
                setCustomThemeJSON('');
            } else {
                setSelectedThemeType('custom');
                const { name: _name, ...rest } = userData.theme as any;
                setCustomThemeJSON(JSON.stringify(rest, null, 2));
            }
        } else {
            setSelectedThemeType('custom');
            const { name: _name, ...rest } = userData.theme as any;
            setCustomThemeJSON(
                JSON.stringify(
                    Object.keys(rest).length > 0 ? rest : userData.theme,
                    null,
                    2,
                ),
            );
        }
    }, [userData]);

    const handleThemeTypeChange = (themeType: string) => {
        setSelectedThemeType(themeType);

        if (themeType === 'custom') {
            const currentTheme = userData?.theme || PRESET_THEMES[0].theme;
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

                setTheme(themeWithName);
                setPendingTheme(themeWithName);
                toast.success(`Applied ${preset.label} theme`);
            }
        }
    };

    const handleApplyCustomTheme = () => {
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
            setTheme(themeWithName);
            setPendingTheme(themeWithName);
            toast.success('Custom theme applied');
        } catch {
            toast.error('Invalid JSON format');
        }
    };

    const handleSave = () => {
        if (!pendingTheme) {
            toast.info('No changes to save');
            return;
        }
        saveMutation.mutate(pendingTheme);
    };

    return (
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
                            open={themePopoverOpen}
                            onOpenChange={setThemePopoverOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant='outline'
                                    role='combobox'
                                    aria-expanded={themePopoverOpen}
                                    className='w-full sm:w-64 justify-between self-center'
                                >
                                    <span className='truncate'>
                                        {selectedThemeType === 'custom'
                                            ? 'Custom'
                                            : PRESET_THEMES.find(
                                                  (p) =>
                                                      p.id === selectedThemeType,
                                              )?.label || 'Select theme...'}
                                    </span>
                                    <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className='w-[var(--radix-popover-trigger-width)] p-0'
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
                                                        handleThemeTypeChange(
                                                            preset.id,
                                                        );
                                                        setThemePopoverOpen(
                                                            false,
                                                        );
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
                                                    handleThemeTypeChange(
                                                        'custom',
                                                    );
                                                    setThemePopoverOpen(false);
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
                                onChange={(e) =>
                                    setCustomThemeJSON(e.target.value)
                                }
                            />
                            <div className='flex justify-end'>
                                <Button
                                    type='button'
                                    onClick={handleApplyCustomTheme}
                                >
                                    Apply Custom Theme
                                </Button>
                            </div>
                        </Field>
                    )}
                </FieldGroup>
                <div className='flex justify-end pt-2'>
                    <Button
                        type='button'
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !pendingTheme}
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </section>
    );
}
