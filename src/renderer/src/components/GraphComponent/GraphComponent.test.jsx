import { render, fireEvent } from '@testing-library/react';
import GraphComponent from './GraphComponent';
import { getGraphData } from '../../services/graphService/graphService';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate } from 'react-router-dom';
import '@testing-library/jest-dom';
import { describe, expect, it } from '@jest/globals';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

jest.mock('../../services/graphService/graphService');

describe('GraphComponent', () => {
    it('fetches graph data on mount', () => {
        getGraphData.mockResolvedValue({ data: { entries: [], links: [] } });
        render(<GraphComponent />);
        expect(getGraphData).toHaveBeenCalled();
    });

    it('renders graph data after fetch', async () => {
        getGraphData.mockResolvedValue({
            data: {
                entries: [{ id: '1', name: 'Entry1', type: 'case' }],
                links: [],
            },
        });
        const { findByText } = render(<GraphComponent />);
        const nodeLabel = await findByText('case: Entry1');
        expect(nodeLabel).toBeInTheDocument();
    });

    it('filters graph on search', async () => {
        getGraphData.mockResolvedValue({
            data: {
                entries: [
                    { id: '1', name: 'Entry1', type: 'case' },
                    { id: '2', name: 'Entry2', type: 'actor' },
                ],
                links: [],
            },
        });
        const { queryByText, findByPlaceholderText, findByTestId } = render(
            <GraphComponent />,
        );
        const toggleButton = await findByTestId('toggle-controls');
        fireEvent.click(toggleButton);
        const searchInput = await findByPlaceholderText('Search Graph');
        fireEvent.change(searchInput, { target: { value: 'Entry2' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
        const nodeLabel = await queryByText('actor: Entry2');
        expect(nodeLabel).toBeInTheDocument();
        expect(await queryByText('case: Entry1')).not.toBeInTheDocument();
    });
});
