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
import { cn } from '@/lib/utils';
import { PRESET_THEMES } from '@/utils/themes';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

interface AppearanceTabProps {
    selectedThemeType: string;
    customThemeJSON: string;
    onCustomThemeJSONChange: (json: string) => void;
    onThemeTypeChange: (themeType: string) => void;
    onApplyCustomTheme: () => void;
}

export default function AppearanceTab({
    selectedThemeType,
    customThemeJSON,
    onCustomThemeJSONChange,
    onThemeTypeChange,
    onApplyCustomTheme,
}: AppearanceTabProps) {
    const [themePopoverOpen, setThemePopoverOpen] = useState(false);

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
                                        <CommandEmpty>No themes found.</CommandEmpty>
                                        <CommandGroup>
                                            {PRESET_THEMES.map((preset) => (
                                                <CommandItem
                                                    key={preset.id}
                                                    value={preset.label}
                                                    onSelect={() => {
                                                        onThemeTypeChange(preset.id);
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
                                                    onThemeTypeChange('custom');
                                                    setThemePopoverOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 size-4',
                                                        selectedThemeType === 'custom'
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
                                onChange={(e) => onCustomThemeJSONChange(e.target.value)}
                            />
                            <div className='flex justify-end'>
                                <Button type='button' onClick={onApplyCustomTheme}>
                                    Apply Custom Theme
                                </Button>
                            </div>
                        </Field>
                    )}
                </FieldGroup>
            </div>
        </section>
    );
}
