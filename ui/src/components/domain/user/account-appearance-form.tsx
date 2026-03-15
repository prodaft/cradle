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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { PRESET_THEMES } from '@/utils/themes';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface AccountAppearanceFormProps {
    target?: string;
}

export default function AccountAppearanceForm({
    target = 'me',
}: AccountAppearanceFormProps) {
    const queryClient = useQueryClient();

    const [selectedThemeType, setSelectedThemeType] = useState<string>('dark');
    const [customThemeJSON, setCustomThemeJSON] = useState<string>('');
    const [themePopoverOpen, setThemePopoverOpen] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<Record<string, any> | null>(null);
    const loadedThemeRef = useRef<Record<string, any> | null>(null);

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        { enabled: !!target, meta: { suppressNotification: true } },
    );

    const saveMutation = useMutation({
        mutationFn: async (theme: Record<string, any>) => {
            if (!userData?.id) return;
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userData.id } },
                body: { theme } as any,
            });
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Settings saved successfully' },
        onSuccess: () => {
            setPendingTheme(null);
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(target),
            });
            queryClient.invalidateQueries({
                queryKey: ['get', '/users/{user_id}/'],
            });
        },
    });

    useEffect(() => {
        if (!userData?.theme) return;

        const theme = userData.theme as Record<string, any>;
        loadedThemeRef.current = theme;

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

                setPendingTheme(themeWithName);
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
            setPendingTheme(themeWithName);
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

    const handleRevert = () => {
        if (loadedThemeRef.current) {
            setPendingTheme(null);
            const themeName = (loadedThemeRef.current as any)?.name;
            if (themeName && themeName !== 'custom') {
                setSelectedThemeType(themeName);
                setCustomThemeJSON('');
            } else {
                setSelectedThemeType('custom');
                const { name: _name, ...rest } = loadedThemeRef.current;
                setCustomThemeJSON(JSON.stringify(rest, null, 2));
            }
        }
    };

    const handleDefault = () => {
        const preset = PRESET_THEMES[0];
        const themeWithName =
            preset.theme &&
            typeof preset.theme === 'object' &&
            !Array.isArray(preset.theme)
                ? 'name' in preset.theme
                    ? preset.theme
                    : { name: preset.id, ...preset.theme }
                : { name: preset.id };
        setPendingTheme(themeWithName);
        setSelectedThemeType(preset.id);
        setCustomThemeJSON('');
    };
    const isAtDefault = selectedThemeType === PRESET_THEMES[0].id && !pendingTheme;

    const headerContainer =
        typeof document !== 'undefined'
            ? document.getElementById('settings-header-actions')
            : null;

    return (
        <>
            {headerContainer &&
                createPortal(
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!pendingTheme}
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
                            type='button'
                            variant='default'
                            size='icon'
                            disabled={saveMutation.isPending || !pendingTheme}
                            onClick={handleSave}
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
                                                      (p) => p.id === selectedThemeType,
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
                                                            setThemePopoverOpen(false);
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
                                                        handleThemeTypeChange('custom');
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
                                    onChange={(e) => setCustomThemeJSON(e.target.value)}
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
                </div>
            </section>
        </>
    );
}
