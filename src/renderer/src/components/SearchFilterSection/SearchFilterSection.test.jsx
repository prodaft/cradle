/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import SearchFilterSection from './SearchFilterSection';
import '@testing-library/jest-dom';
import {
    entityTypesReduced,
    entrySubtypes,
} from '../../utils/entityDefinitions/entityDefinitions';

describe('SearchFilterSection', () => {
    const setShowFilters = jest.fn();
    const setEntryTypeFilters = jest.fn();
    const setEntityTypeFilters = jest.fn();
    const entryTypeFilters = [];
    const entityTypeFilters = [];
    const showFilters = false;
    const handleCheckboxChange = jest.fn();

    it('toggles filters on click', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
                entityTypeFilters={entityTypeFilters}
                setEntityTypeFilters={setEntityTypeFilters}
            />,
        );

        fireEvent.click(getByText('Filters'));
        expect(setShowFilters).toHaveBeenCalledWith(true);
    });

    it('renders entity type filters', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
                entityTypeFilters={entityTypeFilters}
                setEntityTypeFilters={setEntityTypeFilters}
            />,
        );

        entrySubtypes.forEach((filter) => {
            expect(getByText(filter)).toBeInTheDocument();
        });
        entityTypesReduced.forEach((filter) => {
            expect(getByText(filter)).toBeInTheDocument();
        });
    });

    it('changes entity type filters', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
                entityTypeFilters={entityTypeFilters}
                setEntityTypeFilters={setEntityTypeFilters}
            />,
        );

        fireEvent.click(getByText('actor'));
        // it will be called with a lambda function taking "actor as param"
        expect(setEntityTypeFilters).toHaveBeenCalledWith(['actor']);
    });
});
