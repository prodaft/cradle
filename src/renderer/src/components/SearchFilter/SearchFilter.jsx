import React from "react";

/**
 * Single filter for search dialog
 * Manages the state of the filters passed as parameters
 * @param option - the name of the filter
 * @param filters - the current filters
 * @param setFilters - the function to update the filters
 * @returns {SearchFilter}
 * @constructor
 */
export default function SearchFilter({ option, filters, setFilters }) {

    const updatePrevState = (prevState, name, checked) => {
        if (checked) {
            return [...prevState, name];
        } else {
            return prevState.filter(item => item !== name);
        }
    }

    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setFilters(updatePrevState(filters, name, checked));
    };

    return (
        <label key={option} className="flex items-center space-x-3 w-36">
            <input type="checkbox" className="form-checkbox checkbox focus:ring-0" name={option} checked={filters.includes(option)} onChange={handleCheckboxChange} />
            <span>{option}</span>
        </label>
    );
}