import { useEffect, useState } from 'react';

/**
 * useFrontendSearch hook - This hook is used to filter the children based on the search value.
 * The hook returns the following values:
 * - filteredChildren: The children that match the search value
 * - searchVal: The search value
 * - setSearchVal: The function to set the search value
 * To use this hook, pass the children to be filtered.
 * IMPORTANT - The children should have a searchKey prop that will be used for filtering.
 * Update the searchVal using setSearchVal to filter the children.
 * Use the filteredChildren to display the filtered children.
 *
 * @param {Array<React.Component>} children - The children to be filtered
 * @returns {filteredChildren: Array<React.Component>, searchVal: string, setSearchVal: ((string) => void)}
 */
const useFrontendSearch = (children) => {
    const [searchVal, setSearchVal] = useState('');
    const [filteredChildren, setFilteredChildren] = useState(children);

    useEffect(() => {
        if (searchVal === '') {
            setFilteredChildren(children);
        } else {
            const filtered = children.filter((child) =>
                child.props.searchKey.toLowerCase().includes(searchVal.toLowerCase()),
            );
            setFilteredChildren(filtered);
        }
    }, [searchVal, children]);

    return { searchVal, setSearchVal, filteredChildren };
};

export default useFrontendSearch;
