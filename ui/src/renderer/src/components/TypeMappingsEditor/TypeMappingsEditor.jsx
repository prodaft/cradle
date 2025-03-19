import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const TypeMappingsEditor = ({ columns = [], onSave }) => {
    // Ensure 'type' is always the first column
    const allColumns = ['type', ...columns.filter((col) => col !== 'type')];

    // Options for the type select
    const typeOptions = [
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'other', label: 'Other' },
    ];

    // Initialize with one empty row
    const [rows, setRows] = useState([createEmptyRow()]);

    // Create an empty row object
    function createEmptyRow() {
        const emptyRow = { id: Date.now() };
        allColumns.forEach((col) => {
            emptyRow[col] = col === 'type' ? null : '';
        });
        return emptyRow;
    }

    // Add new empty row if the last row has data
    useEffect(() => {
        const lastRow = rows[rows.length - 1];
        const hasData = Object.keys(lastRow).some((key) => {
            if (key === 'id') return false;
            if (key === 'type') return lastRow[key] !== null;
            return lastRow[key] !== '';
        });

        if (hasData) {
            setRows([...rows, createEmptyRow()]);
        }
    }, [rows]);

    // Handle cell change
    const handleCellChange = (rowId, column, value) => {
        setRows((prevRows) =>
            prevRows.map((row) =>
                row.id === rowId ? { ...row, [column]: value } : row,
            ),
        );
    };

    // Handle row deletion
    const handleDeleteRow = (rowId) => {
        setRows((prevRows) => {
            const filtered = prevRows.filter((row) => row.id !== rowId);
            // Ensure we always have at least one row (which might be empty)
            return filtered.length ? filtered : [createEmptyRow()];
        });
    };

    // Handle save
    const handleSave = () => {
        // Filter out completely empty rows and remove the id
        const dataToSave = rows
            .filter((row) => {
                return Object.keys(row).some((key) => {
                    if (key === 'id') return false;
                    if (key === 'type') return row[key] !== null;
                    return row[key] !== '';
                });
            })
            .map(({ id, ...rowData }) => rowData);

        if (onSave) {
            onSave(dataToSave);
        }
    };

    return (
        <div className='w-full overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                    <tr>
                        {allColumns.map((column) => (
                            <th
                                key={column}
                                scope='col'
                                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                            >
                                {column}
                            </th>
                        ))}
                        <th
                            scope='col'
                            className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                        >
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            {allColumns.map((column) => (
                                <td
                                    key={`${row.id}-${column}`}
                                    className='px-6 py-4 whitespace-nowrap'
                                >
                                    {column === 'type' ? (
                                        <Select
                                            value={row[column]}
                                            onChange={(option) =>
                                                handleCellChange(row.id, column, option)
                                            }
                                            options={typeOptions}
                                            className='w-full'
                                            isClearable
                                            placeholder='Select type...'
                                        />
                                    ) : (
                                        <input
                                            type='text'
                                            value={row[column]}
                                            onChange={(e) =>
                                                handleCellChange(
                                                    row.id,
                                                    column,
                                                    e.target.value,
                                                )
                                            }
                                            className='w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                                        />
                                    )}
                                </td>
                            ))}
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                                <button
                                    onClick={() => handleDeleteRow(row.id)}
                                    className='text-red-600 hover:text-red-900'
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className='mt-4 flex justify-end'>
                <button
                    onClick={handleSave}
                    className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default TypeMappingsEditor;
