import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useNdjsonQuery } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import startCase from 'lodash/startCase';
import {
    CheckIcon,
    ChevronsUpDown,
    MoreHorizontal,
    Save,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Option {
    value: string;
    label: string;
}

interface ColumnDefinition {
    type: 'options' | 'number' | 'text';
    required?: boolean;
    default?: any;
    options?: Option[];
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
}

interface ColumnDefinitions {
    [key: string]: ColumnDefinition;
}

interface MappingRow {
    id: string | null;
    edited: boolean;
    [key: string]: any;
}

interface ValidationErrors {
    [key: string]: string;
}

interface TypeMappingsEditorProps {
    id: string;
    name?: string;
    onSave?: () => void;
}

interface InternalClassComboboxProps {
    value: Option | null | undefined;
    options: Option[];
    placeholder: string;
    onChange: (option: Option) => void;
}

const InternalClassCombobox = ({
    value,
    options,
    placeholder,
    onChange,
}: InternalClassComboboxProps) => {
    const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
    const label = value?.label ?? '';

    return (
        <Popover open={isClassPickerOpen} onOpenChange={setIsClassPickerOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant='outline'
                        role='combobox'
                        aria-expanded={isClassPickerOpen}
                        className='w-full justify-between'
                    />
                }
            >
                <span className={cn('truncate', !label && 'text-muted-foreground')}>
                    {label || placeholder}
                </span>
                <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
            </PopoverTrigger>
            <PopoverContent className='w-(--anchor-width) p-0' align='start'>
                <Command>
                    <CommandInput placeholder='Search class...' />
                    <CommandList>
                        <CommandEmpty>No matches found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label || option.value}
                                    onSelect={() => {
                                        onChange(option);
                                        setIsClassPickerOpen(false);
                                    }}
                                >
                                    <CheckIcon
                                        className={cn(
                                            'mr-2 size-4',
                                            option.value === value?.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const TypeMappingsEditor = ({ id, name, onSave }: TypeMappingsEditorProps) => {
    const [rows, setRows] = useState<MappingRow[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const initializedRef = useRef<string | null>(null);

    const { data: mappingKeys, isLoading: isKeysLoading } = useQuery({
        queryKey: ['mappings', 'keys', id],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/mappings/{class_name}/keys/',
                { params: { path: { class_name: id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: { showErrorToast: true },
    });

    const { data: entryClasses, isLoading: isClassesLoading } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'type-mappings'],
        meta: { showErrorToast: true },
    });

    const { data: mappings, isLoading: isMappingsLoading } = useQuery({
        queryKey: ['mappings', 'schema', id],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/mappings/{class_name}/',
                { params: { path: { class_name: id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: { showErrorToast: true },
    });

    const isPageLoading = isKeysLoading || isClassesLoading || isMappingsLoading;

    const columnDefinitions = useMemo<ColumnDefinitions | null>(() => {
        if (!mappingKeys || !entryClasses) return null;

        const mappingKeyDefs = mappingKeys as unknown as ColumnDefinitions;

        const transformedMappingKeys: ColumnDefinitions = {};
        for (const [key, colDef] of Object.entries(mappingKeyDefs)) {
            if (colDef.type === 'options' && colDef.options) {
                const firstOption = colDef.options[0];
                if (typeof firstOption === 'string') {
                    transformedMappingKeys[key] = {
                        ...colDef,
                        options: (colDef.options as unknown as string[]).map((opt) => ({
                            value: opt,
                            label: opt,
                        })),
                    };
                } else {
                    transformedMappingKeys[key] = colDef;
                }
            } else {
                transformedMappingKeys[key] = colDef;
            }
        }

        return {
            ...transformedMappingKeys,
            internal_class: {
                type: 'options',
                options: entryClasses.map((x) => ({
                    value: x.subtype,
                    label: x.subtype,
                })),
                required: true,
            },
        };
    }, [mappingKeys, entryClasses]);

    const deleteMapping = useMutation({
        mutationFn: async (mappingId: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/intelio/mappings/{class_name}/',
                {
                    params: {
                        path: { class_name: id },
                        query: {
                            mapping_id: mappingId,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Mapping deleted successfully',
        },
    });

    const sendMapping = async (body: Record<string, any>) => {
        const init = {
            params: { path: { class_name: id } },
            body: body satisfies Record<string, unknown>,
        };
        const { data, error, response } = body.id
            ? await fetchClient.PATCH('/intelio/mappings/{class_name}/', init)
            : await fetchClient.POST('/intelio/mappings/{class_name}/', init);
        if (error) throw { response, error };
        return data;
    };

    const saveMapping = useMutation({
        mutationFn: sendMapping,
        meta: {
            successMessage: 'Mapping saved successfully',
        },
    });

    const saveAllMappings = useMutation({
        mutationFn: async (dataToSave: Record<string, any>[]) => {
            const promises = dataToSave.map(sendMapping);
            return await Promise.all(promises);
        },
        meta: {
            successMessage: 'All mappings saved successfully',
        },
    });

    const allColumns = columnDefinitions
        ? [
              'internal_class',
              ...Object.keys(columnDefinitions).filter(
                  (col) => col !== 'internal_class',
              ),
          ]
        : [];

    const buildEmptyRow = (definitions: ColumnDefinitions): MappingRow => {
        const emptyRow: MappingRow = { id: null, edited: false };
        const columns = [
            'internal_class',
            ...Object.keys(definitions).filter((col) => col !== 'internal_class'),
        ];

        columns.forEach((col) => {
            const colDef = definitions[col];
            const colType = colDef?.type;
            if (colDef?.default !== undefined) {
                emptyRow[col] = colDef.default;
            } else {
                emptyRow[col] = colType === 'options' ? null : '';
            }
        });
        return emptyRow;
    };

    const buildRequestBody = (
        row: MappingRow,
        opts: { omitId?: boolean } = {},
    ): Record<string, any> => {
        if (!columnDefinitions) return {};
        const body: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
            if (key === 'edited') continue;
            if (opts.omitId && key === 'id') continue;
            if (columnDefinitions[key]?.type === 'options') {
                body[key] = value?.value;
            } else {
                body[key] = value;
            }
        }
        return body;
    };

    useEffect(() => {
        if (!columnDefinitions || !mappings) return;
        if (initializedRef.current === id) return;

        initializedRef.current = id;
        const items = mappings as any[];

        const mappedRows = items.map((mapping) => {
            const transformedMapping: any = {
                id: mapping.id,
                edited: false,
            };

            for (const [key, value] of Object.entries(mapping)) {
                if (key === 'id') continue;

                const colDef = columnDefinitions[key];
                if (
                    colDef?.type === 'options' &&
                    value !== null &&
                    value !== undefined
                ) {
                    if (typeof value === 'string') {
                        transformedMapping[key] = {
                            value: value,
                            label: value,
                        };
                    } else {
                        transformedMapping[key] = value;
                    }
                } else {
                    transformedMapping[key] = value;
                }
            }

            return transformedMapping;
        });

        let initialRows = mappedRows.length > 0 ? mappedRows : [];
        initialRows = [...initialRows, buildEmptyRow(columnDefinitions)];
        setRows(initialRows);
    }, [id, columnDefinitions, mappings]);

    const validateCell = (column: string, value: any, rowIndex: number) => {
        if (!columnDefinitions) return null;
        const colDef = columnDefinitions[column];
        if (!colDef) return null;

        const rowAt = rows[rowIndex];
        if (rowIndex === rows.length - 1 && rowAt && !rowAt.edited) return null;

        if (
            colDef.required &&
            (value === null || value === undefined || value === '')
        ) {
            return `${startCase(column)} is required`;
        }

        switch (colDef.type) {
            case 'options':
                if (colDef.required && !value?.value) {
                    return `${startCase(column)} must be selected`;
                }
                break;
            case 'number':
                if (value !== '' && isNaN(Number(value))) {
                    return `${startCase(column)} must be a number`;
                }
                if (colDef.min !== undefined && Number(value) < colDef.min) {
                    return `${startCase(column)} must be at least ${colDef.min}`;
                }
                if (colDef.max !== undefined && Number(value) > colDef.max) {
                    return `${startCase(column)} must be at most ${colDef.max}`;
                }
                break;
            case 'text':
            default:
                if (typeof value === 'string') {
                    if (
                        colDef.minLength !== undefined &&
                        value.length < colDef.minLength
                    ) {
                        return `${startCase(column)} must be at least ${colDef.minLength} characters`;
                    }
                    if (
                        colDef.maxLength !== undefined &&
                        value.length > colDef.maxLength
                    ) {
                        return `${startCase(column)} must be at most ${colDef.maxLength} characters`;
                    }
                    if (colDef.pattern && !new RegExp(colDef.pattern).test(value)) {
                        return `${startCase(column)} has an invalid format`;
                    }
                }
                break;
        }
        return null;
    };

    const validateRow = (row: MappingRow, rowIndex: number) => {
        const errors: ValidationErrors = {};
        let isInvalid = false;

        if (rowIndex === rows.length - 1 && !row.edited) return { errors, isInvalid };

        allColumns.forEach((column) => {
            const error = validateCell(column, row[column], rowIndex);
            if (error) {
                errors[`${rowIndex}-${column}`] = error;
                isInvalid = true;
            }
        });

        return { errors, isInvalid };
    };

    const updateCell = (rowIndex: number, column: string, value: any) => {
        setRows((prevRows) => {
            const nextRows = prevRows.map((row, idx) =>
                idx === rowIndex ? { ...row, [column]: value, edited: true } : row,
            );

            if (
                columnDefinitions &&
                rowIndex === prevRows.length - 1 &&
                nextRows[rowIndex]?.edited
            ) {
                nextRows.push(buildEmptyRow(columnDefinitions));
            }

            return nextRows;
        });

        const error = validateCell(column, value, rowIndex);
        setValidationErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[`${rowIndex}-${column}`] = error;
            } else {
                delete newErrors[`${rowIndex}-${column}`];
            }
            return newErrors;
        });
    };

    const removeRow = (rowIndex: number) => {
        const row = rows[rowIndex];
        setRows((prevRows) => {
            const filtered = prevRows.filter((_, idx) => idx !== rowIndex);
            if (filtered.length) return filtered;
            return columnDefinitions
                ? [buildEmptyRow(columnDefinitions)]
                : [{ id: null, edited: false }];
        });

        setValidationErrors((prev) => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach((key) => {
                if (key.startsWith(`${rowIndex}-`)) {
                    delete newErrors[key];
                }
            });
            return newErrors;
        });

        if (row?.id) {
            deleteMapping.mutate(row.id);
        }
    };

    const discard = () => {
        setRows((prevRows) =>
            prevRows
                .filter((row) => row.id !== null || !row.edited)
                .map((row) => ({ ...row, edited: false })),
        );
        setValidationErrors({});
        toast.info('Changes discarded');
    };

    const totalMappings = rows.filter((row) => row.id !== null).length;
    const unsavedChanges = rows.filter((row) => row.edited).length;

    const saveRow = (rowIndex: number) => {
        const row = rows[rowIndex];
        if (!row || !row.edited) return;
        if (!columnDefinitions) return;

        const { errors: rowErrors, isInvalid } = validateRow(row, rowIndex);

        const newValidationErrors = { ...validationErrors };

        Object.keys(newValidationErrors).forEach((key) => {
            if (key.startsWith(`${rowIndex}-`)) {
                delete newValidationErrors[key];
            }
        });

        Object.keys(rowErrors).forEach((key) => {
            const msg = rowErrors[key];
            if (msg !== undefined) {
                newValidationErrors[key] = msg;
            }
        });

        setValidationErrors(newValidationErrors);

        if (isInvalid) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        const body = buildRequestBody(row);

        saveMapping.mutate(body, {
            onSuccess: () => {
                setRows((prevRows) =>
                    prevRows.map((r, idx) =>
                        idx === rowIndex ? { ...r, edited: false } : r,
                    ),
                );
                onSave?.();
            },
        });
    };

    const saveAll = () => {
        if (!columnDefinitions) return;

        const allErrors: ValidationErrors = {};
        let anyInvalid = false;

        rows.forEach((row, rowIndex) => {
            if ((rowIndex === rows.length - 1 && !row.edited) || !row.edited) return;

            const { errors, isInvalid } = validateRow(row, rowIndex);
            Object.assign(allErrors, errors);
            if (isInvalid) anyInvalid = true;
        });

        setValidationErrors(allErrors);

        if (anyInvalid) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        const dataToSave = rows
            .filter((row) => row.edited)
            .map((row) => buildRequestBody(row, { omitId: true }));

        if (dataToSave.length === 0) {
            toast.info('No changes to save');
            return;
        }

        saveAllMappings.mutate(dataToSave, {
            onSuccess: () => {
                setRows((prevRows) =>
                    prevRows.map((r) => (r.edited ? { ...r, edited: false } : r)),
                );
                onSave?.();
            },
        });
    };

    if (isPageLoading || !columnDefinitions) {
        return (
            <div className='flex items-center justify-center h-full'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <div className='w-full h-full flex flex-col'>
            {/* Header Section */}
            <div className='flex items-center justify-between gap-4 px-4 pt-4'>
                <div className='flex flex-col gap-0.5'>
                    <div className='flex items-center gap-3'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            Edit Type Mappings{name ? `: ${name}` : ''}
                        </h2>
                        <div className='flex items-center gap-2'>
                            <Badge variant='secondary'>
                                {totalMappings} mapping{totalMappings !== 1 ? 's' : ''}
                            </Badge>
                            {unsavedChanges > 0 && (
                                <Badge
                                    variant='outline'
                                    className='text-amber-600 border-amber-600'
                                >
                                    {unsavedChanges} unsaved
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className='text-muted-foreground'>
                        Manage data type transformations
                    </p>
                </div>
            </div>

            <ScrollArea className='rounded-lg bg-muted/5 p-4 flex-1 h-[70vh]'>
                <div className='overflow-hidden rounded-md border'>
                    <Table>
                        <TableHeader className='sticky top-0 bg-background z-10'>
                            <TableRow>
                                {allColumns.map((column) => (
                                    <TableHead key={column}>
                                        {startCase(column)}
                                        {columnDefinitions[column]?.required && (
                                            <span className='text-destructive ml-1'>
                                                *
                                            </span>
                                        )}
                                    </TableHead>
                                ))}
                                <TableHead className='w-12'>
                                    <span className='sr-only'>Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow
                                    key={index}
                                    className={cn(
                                        row.edited &&
                                            'bg-amber-500/5 hover:bg-amber-500/10',
                                    )}
                                >
                                    {allColumns.map((column) => {
                                        const colDef = columnDefinitions[column];
                                        if (!colDef) {
                                            return (
                                                <TableCell key={`${index}-${column}`} />
                                            );
                                        }
                                        const colType = colDef.type;

                                        if (colType === 'options') {
                                            const options = colDef.options || [];
                                            const selectedValue =
                                                row[column]?.value ?? '';
                                            const isInternalClass =
                                                column === 'internal_class';
                                            return (
                                                <TableCell key={`${index}-${column}`}>
                                                    {isInternalClass ? (
                                                        <InternalClassCombobox
                                                            value={row[column]}
                                                            options={options}
                                                            placeholder={
                                                                colDef.required
                                                                    ? 'Required...'
                                                                    : 'Select...'
                                                            }
                                                            onChange={(
                                                                selectedOption,
                                                            ) => {
                                                                updateCell(
                                                                    index,
                                                                    column,
                                                                    selectedOption,
                                                                );
                                                            }}
                                                        />
                                                    ) : (
                                                        <Select
                                                            items={options}
                                                            value={
                                                                selectedValue
                                                                    ? selectedValue
                                                                    : null
                                                            }
                                                            onValueChange={(value) => {
                                                                if (value === null)
                                                                    return;
                                                                const selectedOption =
                                                                    options.find(
                                                                        (option) =>
                                                                            option.value ===
                                                                            value,
                                                                    );
                                                                updateCell(
                                                                    index,
                                                                    column,
                                                                    selectedOption ?? {
                                                                        value,
                                                                        label: value,
                                                                    },
                                                                );
                                                            }}
                                                        >
                                                            <SelectTrigger className='w-full'>
                                                                <SelectValue
                                                                    placeholder={
                                                                        colDef.required
                                                                            ? 'Required...'
                                                                            : 'Select...'
                                                                    }
                                                                />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {options.map(
                                                                    (option) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                            );
                                        } else if (colType === 'number') {
                                            return (
                                                <TableCell key={`${index}-${column}`}>
                                                    <Input
                                                        type='number'
                                                        value={row[column] ?? ''}
                                                        onChange={(e) =>
                                                            updateCell(
                                                                index,
                                                                column,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className='w-full'
                                                        min={colDef.min}
                                                        max={colDef.max}
                                                        placeholder={
                                                            colDef.required
                                                                ? 'Required'
                                                                : ''
                                                        }
                                                    />
                                                </TableCell>
                                            );
                                        } else {
                                            return (
                                                <TableCell key={`${index}-${column}`}>
                                                    <Input
                                                        type='text'
                                                        value={row[column] ?? ''}
                                                        onChange={(e) =>
                                                            updateCell(
                                                                index,
                                                                column,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className='w-full'
                                                        minLength={colDef.minLength}
                                                        maxLength={colDef.maxLength}
                                                        pattern={colDef.pattern}
                                                        placeholder={
                                                            colDef.required
                                                                ? 'Required'
                                                                : ''
                                                        }
                                                    />
                                                </TableCell>
                                            );
                                        }
                                    })}
                                    <TableCell>
                                        {index !== rows.length - 1 ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button
                                                            variant='ghost'
                                                            className='size-8 p-0'
                                                        />
                                                    }
                                                >
                                                    <span className='sr-only'>
                                                        Open menu
                                                    </span>
                                                    <MoreHorizontal className='size-4' />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align='end'>
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel>
                                                            Actions
                                                        </DropdownMenuLabel>
                                                    </DropdownMenuGroup>
                                                    {row.edited && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    saveRow(index)
                                                                }
                                                            >
                                                                <Save className='size-4' />
                                                                Save row
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger
                                                            render={
                                                                <DropdownMenuItem
                                                                    className='text-destructive focus:text-destructive'
                                                                    closeOnClick={false}
                                                                />
                                                            }
                                                            nativeButton={false}
                                                        >
                                                            <Trash2 className='size-4' />
                                                            Delete mapping
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    Delete Mapping
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you
                                                                    want to delete this
                                                                    mapping? This action
                                                                    cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() =>
                                                                        removeRow(index)
                                                                    }
                                                                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Action buttons at the bottom */}
                <div className='flex justify-end gap-2 mt-4'>
                    {unsavedChanges > 0 && (
                        <Button variant='outline' onClick={discard}>
                            <Undo2 className='size-4' />
                            Discard Changes
                        </Button>
                    )}
                    <Button
                        variant='default'
                        onClick={saveAll}
                        disabled={!rows.some((row) => row.edited)}
                    >
                        <Save className='size-4' />
                        Save Changes
                    </Button>
                </div>
                <ScrollBar orientation='horizontal' />
            </ScrollArea>
        </div>
    );
};

export default TypeMappingsEditor;
