/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import EntryListCard from './EntryListCard';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));

describe('EntryListCard', () => {
    const items = [
        { name: 'Item 1', id: 1, type: 'actor' },
        { name: 'Item 2', id: 2, type: 'entity' },
        { name: 'Item 3', id: 3, type: 'artifact', subtype: 'ip' },
    ];

    it('renders the title correctly', () => {
        const title = 'My List';
        render(<EntryListCard title={title} items={items} />);
        const titleElement = screen.getByText(title);
        expect(titleElement).toBeInTheDocument();
    });

    it('renders the correct number of items', () => {
        render(<EntryListCard title='My List' items={items} />);
        const itemElements = screen.getAllByRole('paragraph');
        expect(itemElements.length).toBe(items.length);
    });

    it('navigates to the correct dashboard when an item is clicked', () => {
        const navigate = jest.fn();
        useNavigate.mockReturnValue(navigate);

        render(<EntryListCard title='My List' items={items} />);
        const itemElement = screen.getByText(items[0].name);
        itemElement.click();

        expect(navigate).toHaveBeenCalledWith(
            `/dashboards/actors/${encodeURIComponent(items[0].name)}/`,
        );
    });
});
