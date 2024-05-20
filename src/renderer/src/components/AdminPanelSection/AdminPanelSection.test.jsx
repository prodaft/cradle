/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react';
import AdminPanelSection from './AdminPanelSection';
import '@testing-library/jest-dom';

describe('AdminPanelSection', () => {
    const mockHandleAdd = jest.fn();

    it('renders without crashing', () => {
        render(<AdminPanelSection title="Test" addEnabled={true} addTooltipText="Add" handleAdd={mockHandleAdd} />);
    });

    it('filters children based on search value', () => {
        const { getByPlaceholderText, queryByText } = render(
            <AdminPanelSection title="Test" addEnabled={true} addTooltipText="Add" handleAdd={mockHandleAdd}>
                <div name="Test Child 1" searchKey="Test Child 1" >Test Child 1</div>
                <div name="Test Child 2" searchKey="Test Child 2" >Test Child 2</div>
            </AdminPanelSection>
        );

        fireEvent.change(getByPlaceholderText('Search'), { target: { value: '1' } });
        expect(queryByText('Test Child 1')).not.toBeNull();
        expect(queryByText('Test Child 2')).toBeNull();
    });

    it('calls handleAdd when add button is clicked', () => {
        const { getByRole } = render(<AdminPanelSection title="Test" addEnabled={true} addTooltipText="Add" handleAdd={mockHandleAdd} />);
        fireEvent.click(getByRole('button'));
        expect(mockHandleAdd).toHaveBeenCalled();
    });
});