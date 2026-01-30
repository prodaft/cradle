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
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import useApi from '@/hooks/api/useApi';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { startCase } from 'lodash';
import {
    CheckIcon,
    ChevronsUpDown,
    MoreHorizontal,
    Save,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface RowData {
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
    const [open, setOpen] = useState(false);
    const selectedLabel = value?.label ?? '';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={open}
                    className='w-full justify-between'
                >
                    <span
                        className={cn(
                            'truncate',
                            !selectedLabel && 'text-muted-foreground',
                        )}
                    >
                        {selectedLabel || placeholder}
                    </span>
                    <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className='w-[var(--radix-popover-trigger-width)] p-0'
                align='start'
            >
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
                                        setOpen(false);
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
    const [columnDefinitions, setColumnDefinitions] =
        useState<ColumnDefinitions | null>(null);
    const [rows, setRows] = useState<RowData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const { intelioApi, entriesApi } = useApi();

    // Mutations for fetching data
    const fetchMappingKeysMutation = useMutation({
        mutationFn: async () => {
            return await intelioApi.mappingsKeysSchema({ className: id });
        },
        meta: {
            suppressNotification: true,
        },
    });

    const fetchEntryClassesMutation = useMutation({
        mutationFn: async () => {
            return await entriesApi.entryClassesList({});
        },
        meta: {
            suppressNotification: true,
        },
    });

    const fetchMappingsMutation = useMutation({
        mutationFn: async () => {
            return await intelioApi.mappingsSchemaList({ className: id });
        },
        meta: {
            suppressNotification: true,
        },
    });

    // Mutations for saving/deleting
    const deleteMappingMutation = useMutation({
        mutationFn: async (mappingId: string) => {
            return await intelioApi.mappingsSchemaDestroy({ className: id, mappingId });
        },
        meta: {
            successMessage: 'Mapping deleted successfully',
            errorMessage: 'Failed to delete mapping',
        },
    });

    const saveMappingMutation = useMutation({
        mutationFn: async (rowData: Record<string, any>) => {
            return await intelioApi.mappingsSchemaCreateOrUpdate({
                className: id,
                requestBody: rowData,
            });
        },
        meta: {
            successMessage: 'Mapping saved successfully',
            errorMessage: 'Failed to save mapping',
        },
    });

    const saveAllMappingsMutation = useMutation({
        mutationFn: async (dataToSave: Record<string, any>[]) => {
            // Save all mappings sequentially
            const promises = dataToSave.map((rowData) =>
                intelioApi.mappingsSchemaCreateOrUpdate({
                    className: id,
                    requestBody: rowData,
                }),
            );
            return await Promise.all(promises);
        },
        meta: {
            successMessage: 'All mappings saved successfully',
            errorMessage: 'Failed to save mappings',
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

    // Create a new empty row using defaults if provided; note id is null by default.
    function createEmptyRow(): RowData {
        const emptyRow: RowData = { id: null, edited: false };
        allColumns.forEach((col) => {
            if (!columnDefinitions) return;
            const colDef = columnDefinitions[col];
            const colType = colDef?.type;
            if (colDef?.default !== undefined) {
                emptyRow[col] = colDef.default;
            } else {
                emptyRow[col] = colType === 'options' ? null : '';
            }
        });
        return emptyRow;
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Returns a record of column definitions
                const mappingKeys =
                    (await fetchMappingKeysMutation.mutateAsync()) as unknown as ColumnDefinitions;

                const entryClasses = await fetchEntryClassesMutation.mutateAsync();
                const mappings = (await fetchMappingsMutation.mutateAsync()) as any[]; // The response here is a list of objects with dynamic keys

                // Transform string arrays in options to {value, label} format
                const transformedMappingKeys: ColumnDefinitions = {};
                for (const [key, colDef] of Object.entries(mappingKeys)) {
                    if (colDef.type === 'options' && colDef.options) {
                        // Check if options are strings and need transformation
                        const firstOption = colDef.options[0];
                        if (typeof firstOption === 'string') {
                            transformedMappingKeys[key] = {
                                ...colDef,
                                options: (colDef.options as unknown as string[]).map(
                                    (opt) => ({
                                        value: opt,
                                        label: opt,
                                    }),
                                ),
                            };
                        } else {
                            transformedMappingKeys[key] = colDef;
                        }
                    } else {
                        transformedMappingKeys[key] = colDef;
                    }
                }

                const cols: ColumnDefinitions = {
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
                setColumnDefinitions(cols);

                // Transform option values in existing data to {value, label} format
                const mappedRows = mappings.map((mapping) => {
                    const transformedMapping: any = {
                        id: mapping.id,
                        edited: false,
                    };

                    for (const [key, value] of Object.entries(mapping)) {
                        if (key === 'id') continue;

                        const colDef = cols[key];
                        if (
                            colDef?.type === 'options' &&
                            value !== null &&
                            value !== undefined
                        ) {
                            // Transform string values to {value, label} format
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
                // We can't append createEmptyRow directly here because we need columnDefinitions state set first?
                // Actually, we have 'cols' available here, so we can use it.

                // Helper to create empty row with local cols
                const createLocalEmptyRow = (definitions: ColumnDefinitions) => {
                    const emptyRow: RowData = { id: null, edited: false };
                    const columns = [
                        'internal_class',
                        ...Object.keys(definitions).filter(
                            (col) => col !== 'internal_class',
                        ),
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

                initialRows = [...initialRows, createLocalEmptyRow(cols)];
                setRows(initialRows);
            } catch (error) {
                // Error already handled by mutation
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, intelioApi, entriesApi]);

    // Auto-add a new empty row when the last row has been edited.
    useEffect(() => {
        if (!columnDefinitions) return;
        const lastRow = rows[rows.length - 1];
        if (!lastRow) return;
        if (lastRow.edited) {
            setRows([...rows, createEmptyRow()]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, columnDefinitions]);

    // Validate a single cell
    const validateCell = (column: string, value: any, rowIndex: number) => {
        if (!columnDefinitions) return null;
        const colDef = columnDefinitions[column];
        if (!colDef) return null;

        // Skip validation for the last empty row
        if (rowIndex === rows.length - 1 && !rows[rowIndex].edited) return null;

        // Required field validation
        if (
            colDef.required &&
            (value === null || value === undefined || value === '')
        ) {
            return `${startCase(column)} is required`;
        }

        // Type-specific validations
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

    // Validate an entire row
    const validateRow = (row: RowData, rowIndex: number) => {
        const errors: ValidationErrors = {};
        let hasError = false;

        // Skip validation for the last empty row
        if (rowIndex === rows.length - 1 && !row.edited) return { errors, hasError };

        allColumns.forEach((column) => {
            const error = validateCell(column, row[column], rowIndex);
            if (error) {
                errors[`${rowIndex}-${column}`] = error;
                hasError = true;
            }
        });

        return { errors, hasError };
    };

    // Use the row index to update the row.
    const handleCellChange = (rowIndex: number, column: string, value: any) => {
        setRows((prevRows) =>
            prevRows.map((row, idx) =>
                idx === rowIndex ? { ...row, [column]: value, edited: true } : row,
            ),
        );

        // Validate the changed cell
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

    const handleDeleteRow = (rowIndex: number) => {
        const row = rows[rowIndex];
        setRows((prevRows) => {
            const filtered = prevRows.filter((_, idx) => idx !== rowIndex);
            return filtered.length ? filtered : [createEmptyRow()];
        });

        // Clear validation errors for deleted row
        setValidationErrors((prev) => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach((key) => {
                if (key.startsWith(`${rowIndex}-`)) {
                    delete newErrors[key];
                }
            });
            return newErrors;
        });

        if (row.id) {
            deleteMappingMutation.mutate(row.id);
        }
    };

    const handleDiscardChanges = () => {
        // Reset all edited rows to their original state
        setRows((prevRows) =>
            prevRows
                .filter((row) => row.id !== null || !row.edited) // Remove new unsaved rows
                .map((row) => ({ ...row, edited: false })),
        );
        setValidationErrors({});
        toast.info('Changes discarded');
    };

    // Calculate stats
    const totalMappings = rows.filter((row) => row.id !== null).length;
    const unsavedChanges = rows.filter((row) => row.edited).length;

    const handleSaveRow = (rowIndex: number) => {
        const row = rows[rowIndex];
        if (!row.edited) return;
        if (!columnDefinitions) return;

        // Validate the specific row and update the validation errors state
        const rowErrors: ValidationErrors = {};
        allColumns.forEach((column) => {
            const error = validateCell(column, row[column], rowIndex);
            if (error) {
                rowErrors[`${rowIndex}-${column}`] = error;
            }
        });

        // Update validation errors state with new errors
        const newValidationErrors = { ...validationErrors };

        // Remove old errors for this row
        Object.keys(newValidationErrors).forEach((key) => {
            if (key.startsWith(`${rowIndex}-`)) {
                delete newValidationErrors[key];
            }
        });

        // Add new errors
        Object.keys(rowErrors).forEach((key) => {
            newValidationErrors[key] = rowErrors[key];
        });

        setValidationErrors(newValidationErrors);

        // Check if there are any errors
        if (Object.keys(rowErrors).length > 0) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        const rowData: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
            if (key !== 'edited') {
                if (columnDefinitions[key]?.type === 'options') {
                    rowData[key] = value?.value;
                } else {
                    rowData[key] = value;
                }
            }
        }

        saveMappingMutation.mutate(rowData, {
            onSuccess: () => {
                // Update the row to mark it as not edited
                setRows((prevRows) =>
                    prevRows.map((r, idx) =>
                        idx === rowIndex ? { ...r, edited: false } : r,
                    ),
                );
            },
        });
    };

    const handleSaveAll = () => {
        if (!columnDefinitions) return;

        // First, validate all edited rows and update the validation errors state
        const allErrors: ValidationErrors = {};
        let hasErrors = false;

        rows.forEach((row, rowIndex) => {
            // Skip validation for the last empty row or non-edited rows
            if ((rowIndex === rows.length - 1 && !row.edited) || !row.edited) return;

            allColumns.forEach((column) => {
                const error = validateCell(column, row[column], rowIndex);
                if (error) {
                    allErrors[`${rowIndex}-${column}`] = error;
                    hasErrors = true;
                }
            });
        });

        // Update validation errors state with new errors
        setValidationErrors(allErrors);

        // If there are errors, show alert and return
        if (hasErrors) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        const dataToSave = rows
            .filter((row) => row.edited)
            .map(({ id: rowId, edited, ...rowData }) => {
                const data: Record<string, any> = {};
                for (const [key, value] of Object.entries(rowData)) {
                    if (columnDefinitions[key]?.type === 'options') {
                        data[key] = value?.value;
                    } else {
                        data[key] = value;
                    }
                }
                return data;
            });

        if (dataToSave.length === 0) {
            toast.info('No changes to save');
            return;
        }

        saveAllMappingsMutation.mutate(dataToSave, {
            onSuccess: () => {
                // Update all rows to mark them as not edited
                setRows((prevRows) =>
                    prevRows.map((r) => (r.edited ? { ...r, edited: false } : r)),
                );
            },
        });
    };

    // Get used internal_class values to filter options
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getAvailableInternalClassOptions = (rowIndex: number) => {
        return columnDefinitions?.internal_class?.options || [];
    };

    if (isLoading || !columnDefinitions) {
        return (
            <div className='flex items-center justify-center h-full'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <div className='w-full h-full overflow-auto flex flex-col'>
            {/* Header Section */}
            <div className='flex items-center justify-between gap-4 px-4 pt-4'>
                <div className='flex flex-col gap-0.5'>
                    <div className='flex items-center gap-3'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            Edit Type Mappings
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

            <div className='rounded-lg bg-muted/5 p-4 flex-1 overflow-auto h-[70vh]'>
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
                                        const colType = colDef?.type;

                                        if (colType === 'options') {
                                            const options = colDef?.options || [];
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
                                                                handleCellChange(
                                                                    index,
                                                                    column,
                                                                    selectedOption,
                                                                );
                                                            }}
                                                        />
                                                    ) : (
                                                        <Select
                                                            value={
                                                                selectedValue
                                                                    ? selectedValue
                                                                    : undefined
                                                            }
                                                            onValueChange={(value) => {
                                                                const selectedOption =
                                                                    options.find(
                                                                        (option) =>
                                                                            option.value ===
                                                                            value,
                                                                    );
                                                                handleCellChange(
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
                                                            handleCellChange(
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
                                                            handleCellChange(
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
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant='ghost'
                                                        className='size-8 p-0'
                                                    >
                                                        <span className='sr-only'>
                                                            Open menu
                                                        </span>
                                                        <MoreHorizontal className='size-4' />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align='end'>
                                                    <DropdownMenuLabel>
                                                        Actions
                                                    </DropdownMenuLabel>
                                                    {row.edited && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleSaveRow(index)
                                                                }
                                                            >
                                                                <Save className='size-4' />
                                                                Save row
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                className='text-destructive focus:text-destructive'
                                                                onSelect={(e) =>
                                                                    e.preventDefault()
                                                                }
                                                            >
                                                                <Trash2 className='size-4' />
                                                                Delete mapping
                                                            </DropdownMenuItem>
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
                                                                        handleDeleteRow(
                                                                            index,
                                                                        )
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
                        <Button variant='outline' onClick={handleDiscardChanges}>
                            <Undo2 className='size-4' />
                            Discard Changes
                        </Button>
                    )}
                    <Button
                        variant='default'
                        onClick={handleSaveAll}
                        disabled={!rows.some((row) => row.edited)}
                    >
                        <Save className='size-4' />
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TypeMappingsEditor;
