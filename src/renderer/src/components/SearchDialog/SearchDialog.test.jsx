/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchDialog from './SearchDialog';
import { queryEntities } from '../../services/queryService/queryService';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
jest.mock('../../services/queryService/queryService');
jest.mock('../../hooks/useAuth/useAuth');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

describe('SearchDialog', () => {
    const mockNavigate = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        useNavigate.mockReturnValue(mockNavigate);
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when open', () => {
        queryEntities.mockResolvedValueOnce({ data: [] });
        render(<SearchDialog isOpen={true} onClose={mockOnClose} />);

        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
        expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('focuses the input when opened', () => {
        queryEntities.mockResolvedValueOnce({ data: [] });
        render(<SearchDialog isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByPlaceholderText('Search...')).toHaveFocus();
    });

    it('calls queryEntities on search button click', async () => {
        queryEntities.mockResolvedValueOnce({ data: [] });
        render(<SearchDialog isOpen={true} onClose={mockOnClose} />);

        queryEntities.mockResolvedValueOnce({
            data: [{ name: 'Test', type: 'Type', subtype: 'Subtype' }],
        });
        fireEvent.change(screen.getByPlaceholderText('Search...'), {
            target: { value: 'test' },
        });
        fireEvent.click(screen.getByRole('button'));

        expect(queryEntities).toHaveBeenCalledWith('test', [], []);
        await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
        await waitFor(() =>
            expect(screen.getByText('Type: Subtype')).toBeInTheDocument(),
        );
    });

    it('displays an error message on query failure', async () => {
        queryEntities.mockRejectedValueOnce({ data: [] });
        const { getByTestId } = render(
            <SearchDialog isOpen={true} onClose={mockOnClose} />,
        );

        queryEntities.mockRejectedValueOnce({ response: { status: 401 } });
        fireEvent.change(screen.getByPlaceholderText('Search...'), {
            target: { value: 'test' },
        });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('calls onClose and navigate on result click', async () => {
        queryEntities.mockResolvedValueOnce({ data: [] });
        render(<SearchDialog isOpen={true} onClose={mockOnClose} />);

        queryEntities.mockResolvedValueOnce({
            data: [{ name: 'Test', type: 'Type', subtype: 'Subtype' }],
        });
        fireEvent.change(screen.getByPlaceholderText('Search...'), {
            target: { value: 'test' },
        });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => fireEvent.click(screen.getByText('Test')));
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            '/dashboards/Types/Test/?subtype=Subtype',
        );
    });

    it('queryes result on open', async () => {
        queryEntities.mockResolvedValueOnce({
            data: [{ name: 'Test', type: 'Type', subtype: 'Subtype' }],
        });
        render(<SearchDialog isOpen={true} onClose={mockOnClose} />);

        expect(queryEntities).toHaveBeenCalledWith('', [], []);
        await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
        await waitFor(() =>
            expect(screen.getByText('Type: Subtype')).toBeInTheDocument(),
        );
    });
});
