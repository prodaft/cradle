/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import SearchFilterSection from './SearchFilterSection';
import '@testing-library/jest-dom';
import {
    entryTypesReduced,
    artifactSubtypes,
} from '../../utils/entryDefinitions/entryDefinitions';

describe('SearchFilterSection', () => {
    const setShowFilters = jest.fn();
    const setArtifactTypeFilters = jest.fn();
    const setEntryTypeFilters = jest.fn();
    const artifactTypeFilters = [];
    const entryTypeFilters = [];
    const showFilters = false;
    const handleCheckboxChange = jest.fn();

    it('toggles filters on click', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                artifactTypeFilters={artifactTypeFilters}
                setArtifactTypeFilters={setArtifactTypeFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
            />,
        );

        fireEvent.click(getByText('Filters'));
        expect(setShowFilters).toHaveBeenCalledWith(true);
    });

    it('renders entry type filters', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                artifactTypeFilters={artifactTypeFilters}
                setArtifactTypeFilters={setArtifactTypeFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
            />,
        );

        artifactSubtypes.forEach((filter) => {
            expect(getByText(filter)).toBeInTheDocument();
        });
        entryTypesReduced.forEach((filter) => {
            expect(getByText(filter)).toBeInTheDocument();
        });
    });

    it('changes entry type filters', () => {
        const { getByText } = render(
            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                artifactTypeFilters={artifactTypeFilters}
                setArtifactTypeFilters={setArtifactTypeFilters}
                entryTypeFilters={entryTypeFilters}
                setEntryTypeFilters={setEntryTypeFilters}
            />,
        );

        fireEvent.click(getByText('actor'));
        // it will be called with a lambda function taking "actor as param"
        expect(setEntryTypeFilters).toHaveBeenCalledWith(['actor']);
    });
});
