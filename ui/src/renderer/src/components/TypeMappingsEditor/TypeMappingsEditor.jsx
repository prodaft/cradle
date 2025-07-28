import { useEffect, useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getEntryClasses } from '../../services/adminService/adminService';
import {
    deleteMapping,
    getMappingKeys,
    getMappings,
    saveMapping,
} from '../../services/intelioService/intelioService';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Selector from '../Selector/Selector';

const TypeMappingsEditor = ({ id }) => {
    const [columnDefinitions, setColumnDefinitions] = useState(null);
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [validationErrors, setValidationErrors] = useState({});
    const { navigate, navigateLink } = useCradleNavigate();

    const allColumns = columnDefinitions
        ? [
              'internal_class',
              ...Object.keys(columnDefinitions).filter(
                  (col) => col !== 'internal_class',
              ),
          ]
        : [];

    // Create a new empty row using defaults if provided; note id is null by default.
    function createEmptyRow() {
        const emptyRow = { id: null, edited: false };
        allColumns.forEach((col) => {
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
                const mappingKeys = await getMappingKeys(id);
                const entryClasses = await getEntryClasses();
                const mappings = await getMappings(id);
                const cols = {
                    ...mappingKeys.data,
                    internal_class: {
                        type: 'options',
                        options: entryClasses.data.map((x) => ({
                            value: x.subtype,
                            label: x.subtype,
                        })),
                        required: true,
                    },
                };
                setColumnDefinitions(cols);

                const mappedRows = mappings.data.map((mapping) => ({
                    ...mapping,
                    internal_class: {
                        value: mapping.internal_class,
                        label: mapping.internal_class,
                    },
                    id: mapping.id,
                    edited: false,
                }));
                let initialRows = mappedRows.length > 0 ? mappedRows : [];
                initialRows = [...initialRows, createEmptyRow()];
                setRows(initialRows);
            } catch (error) {
                console.error('Error fetching column definitions:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // Auto-add a new empty row when the last row has been edited.
    useEffect(() => {
        if (!columnDefinitions) return;
        const lastRow = rows[rows.length - 1];
        if (!lastRow) return;
        if (lastRow.edited) {
            setRows([...rows, createEmptyRow()]);
        }
    }, [rows, columnDefinitions]);

    // Validate a single cell
    const validateCell = (column, value, rowIndex) => {
        const colDef = columnDefinitions[column];
        if (!colDef) return null;

        // Skip validation for the last empty row
        if (rowIndex === rows.length - 1 && !rows[rowIndex].edited) return null;

        // Required field validation
        if (
            colDef.required &&
            (value === null || value === undefined || value === '')
        ) {
            return `${capitalizeString(column)} is required`;
        }

        // Type-specific validations
        switch (colDef.type) {
            case 'options':
                if (colDef.required && !value?.value) {
                    return `${capitalizeString(column)} must be selected`;
                }
                break;
            case 'number':
                if (value !== '' && isNaN(Number(value))) {
                    return `${capitalizeString(column)} must be a number`;
                }
                if (colDef.min !== undefined && Number(value) < colDef.min) {
                    return `${capitalizeString(column)} must be at least ${colDef.min}`;
                }
                if (colDef.max !== undefined && Number(value) > colDef.max) {
                    return `${capitalizeString(column)} must be at most ${colDef.max}`;
                }
                break;
            case 'text':
            default:
                if (colDef.minLength !== undefined && value.length < colDef.minLength) {
                    return `${capitalizeString(column)} must be at least ${colDef.minLength} characters`;
                }
                if (colDef.maxLength !== undefined && value.length > colDef.maxLength) {
                    return `${capitalizeString(column)} must be at most ${colDef.maxLength} characters`;
                }
                if (colDef.pattern && !new RegExp(colDef.pattern).test(value)) {
                    return `${capitalizeString(column)} has an invalid format`;
                }
                break;
        }
        return null;
    };

    // Validate an entire row
    const validateRow = (row, rowIndex) => {
        const errors = {};
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

    // Validate all rows
    const validateAllRows = () => {
        let allErrors = {};
        let hasAnyError = false;

        rows.forEach((row, rowIndex) => {
            // Skip validation for the last empty row
            if (rowIndex === rows.length - 1 && !row.edited) return;

            const { errors, hasError } = validateRow(row, rowIndex);
            allErrors = { ...allErrors, ...errors };
            if (hasError) hasAnyError = true;
        });

        // Update validation errors state
        setValidationErrors(allErrors);
        return !hasAnyError;
    };

    // Force validation of all rows without requiring user input
    const validateAllRowsAndShowErrors = () => {
        // This will update the validation errors state and return validation result
        return validateAllRows();
    };

    // Use the row index to update the row.
    const handleCellChange = (rowIndex, column, value) => {
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

    const handleDeleteRow = (rowIndex) => {
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
            deleteMapping(id, row.id)
                .then((response) => {
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'Mapping deleted successfully',
                            color: 'green',
                        });
                    } else {
                        setAlert({
                            show: true,
                            message: 'Failed to delete mapping',
                            color: 'red',
                        });
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    };

    const handleSaveRow = (rowIndex) => {
        const row = rows[rowIndex];
        if (!row.edited) return;

        // Validate the specific row and update the validation errors state
        const rowErrors = {};
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
            setAlert({
                show: true,
                message: 'Please fix validation errors before saving',
                color: 'red',
            });
            return;
        }

        const rowData = {};
        for (const [key, value] of Object.entries(row)) {
            if (key !== 'edited') {
                if (columnDefinitions[key]?.type === 'options') {
                    rowData[key] = value?.value;
                } else {
                    rowData[key] = value;
                }
            }
        }

        saveMapping(id, rowData)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        message: 'Mapping saved successfully',
                        color: 'green',
                    });
                    // Update the row to mark it as not edited
                    setRows((prevRows) =>
                        prevRows.map((r, idx) =>
                            idx === rowIndex ? { ...r, edited: false } : r,
                        ),
                    );
                } else {
                    setAlert({
                        show: true,
                        message: 'Failed to save mapping',
                        color: 'red',
                    });
                }
            })
            .catch((err) => displayError(setAlert, navigate)(err));
    };

    const handleSaveAll = () => {
        // First, validate all edited rows and update the validation errors state
        const allErrors = {};
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
            setAlert({
                show: true,
                message: 'Please fix validation errors before saving',
                color: 'red',
            });
            return;
        }

        const dataToSave = rows
            .filter((row) => row.edited)
            .map(({ id: rowId, edited, ...rowData }) => {
                const data = {};
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
            setAlert({
                show: true,
                message: 'No changes to save',
                color: 'yellow',
            });
            return;
        }

        for (const row of dataToSave) {
            saveMapping(id, row)
                .then((response) => {
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'All mappings saved successfully',
                            color: 'green',
                        });
                        // Update all rows to mark them as not edited
                        setRows((prevRows) =>
                            prevRows.map((r) =>
                                r.edited ? { ...r, edited: false } : r,
                            ),
                        );
                    } else {
                        setAlert({
                            show: true,
                            message: 'Failed to save all mappings',
                            color: 'red',
                        });
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    };

    // Get used internal_class values to filter options
    const getAvailableInternalClassOptions = (rowIndex) => {
        return columnDefinitions?.internal_class?.options || [];
    };

    if (isLoading || !columnDefinitions) {
        return (
            <div className='flex items-center justify-center h-full'>
                <div className='spinner-dot-pulse spinner-xl'>
                    <div className='spinner-pulse-dot'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='container w-[90%] h-full mx-auto my-4'>
            <AlertDismissible alert={alert} setAlert={setAlert} />

            <h1 className='text-3xl font-bold my-4'>Edit Type Mappings</h1>
            <div className='h-full mx-auto bg-gray-2 rounded-md my-4 p-4'>
                {/* Save All button moved to the left */}
                <div className='flex justify-start mb-4'>
                    <button
                        onClick={handleSaveAll}
                        disabled={!rows.some((row) => row.edited)}
                        className={`btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 ${
                            !rows.some((row) => row.edited) &&
                            'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        Save All
                    </button>
                </div>

                {/* Table container with fixed height and scrollable */}
                <div className='overflow-x-auto overflow-y-auto h-[70vh] border border-gray-3 rounded-md'>
                    <table className='table-auto w-full mb-4 w-dvh'>
                        <thead className='sticky top-0 bg-gray-2 z-10'>
                            <tr>
                                {/* Actions column */}
                                <th className='px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                    Actions
                                </th>
                                {allColumns.map((column) => (
                                    <th
                                        key={column}
                                        className='px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-96'
                                    >
                                        {capitalizeString(column)}
                                        {columnDefinitions[column]?.required && (
                                            <span className='text-red-500 ml-1'>*</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr
                                    key={index}
                                    className={
                                        index < rows.length - 1 && !row.edited
                                            ? 'bg-gray-1'
                                            : ''
                                    }
                                >
                                    {/* Actions cell with Delete and Save buttons */}
                                    <td className='px-4 py-2 whitespace-nowrap'>
                                        <div className='flex space-x-2'>
                                            {index != rows.length - 1 && (
                                                <button
                                                    onClick={() =>
                                                        handleDeleteRow(index)
                                                    }
                                                    className='text-red-600 hover:text-red-900'
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            {row.edited && (
                                                <button
                                                    onClick={() => handleSaveRow(index)}
                                                    className='text-green-600 hover:text-green-900'
                                                >
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    {allColumns.map((column) => {
                                        const colDef = columnDefinitions[column];
                                        const colType = colDef?.type;
                                        const errorKey = `${index}-${column}`;
                                        const hasError = validationErrors[errorKey];

                                        if (colType === 'options') {
                                            return (
                                                <td
                                                    key={`${index}-${column}`}
                                                    className='px-2 py-2'
                                                >
                                                    <Selector
                                                        value={row[column]}
                                                        onChange={(option) =>
                                                            handleCellChange(
                                                                index,
                                                                column,
                                                                option,
                                                            )
                                                        }
                                                        staticOptions={
                                                            column === 'internal_class'
                                                                ? getAvailableInternalClassOptions(
                                                                      index,
                                                                  )
                                                                : colDef.options
                                                        }
                                                        placeholder={
                                                            colDef.required
                                                                ? 'Required...'
                                                                : 'Select...'
                                                        }
                                                        isClearable={!colDef.required}
                                                        classNames={{
                                                            control: hasError
                                                                ? 'border-red-500'
                                                                : '',
                                                        }}
                                                        menuPosition='fixed'
                                                    />
                                                    {/*hasError && (
                                                        <p className='text-red-500 text-xs mt-1'>{validationErrors[errorKey]}</p>
                                                    )*/}
                                                </td>
                                            );
                                        } else if (colType === 'number') {
                                            return (
                                                <td
                                                    key={`${index}-${column}`}
                                                    className='px-2 py-2'
                                                >
                                                    <input
                                                        type='number'
                                                        value={row[column]}
                                                        onChange={(e) =>
                                                            handleCellChange(
                                                                index,
                                                                column,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={`form-input input input-block ${hasError ? 'border-red-500' : 'input-ghost-primary'} focus:ring-0 w-full`}
                                                        min={colDef.min}
                                                        max={colDef.max}
                                                        placeholder={
                                                            colDef.required
                                                                ? 'Required'
                                                                : ''
                                                        }
                                                    />
                                                    {/*hasError && (
                                                        <p className='text-red-500 text-xs mt-1'>{validationErrors[errorKey]}</p>
                                                    )*/}
                                                </td>
                                            );
                                        } else {
                                            return (
                                                <td
                                                    key={`${index}-${column}`}
                                                    className='px-2 py-2'
                                                >
                                                    <input
                                                        type='text'
                                                        value={row[column]}
                                                        onChange={(e) =>
                                                            handleCellChange(
                                                                index,
                                                                column,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={`form-input input input-block ${hasError ? 'border-red-500' : 'input-ghost-primary'} focus:ring-0 w-full`}
                                                        minLength={colDef.minLength}
                                                        maxLength={colDef.maxLength}
                                                        pattern={colDef.pattern}
                                                        placeholder={
                                                            colDef.required
                                                                ? 'Required'
                                                                : ''
                                                        }
                                                    />
                                                    {/*hasError && (
                                                        <p className='text-red-500 text-xs mt-1'>{validationErrors[errorKey]}</p>
                                                    )*/}
                                                </td>
                                            );
                                        }
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TypeMappingsEditor;
