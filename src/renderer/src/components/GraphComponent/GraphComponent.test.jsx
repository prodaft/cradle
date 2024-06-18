import { render, fireEvent } from '@testing-library/react';
import GraphComponent from './GraphComponent';
import { getGraphData } from '../../services/graphService/graphService';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import { useAuth } from '../../hooks/useAuth/useAuth';
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
    useAuth.mockReturnValue({ access: 'token' });

    it('fetches graph data on mount', () => {
        getGraphData.mockResolvedValue({ data: { entities: [], links: [] } });
        render(<GraphComponent />);
        expect(getGraphData).toHaveBeenCalled();
    });

    it('renders graph data after fetch', async () => {
        getGraphData.mockResolvedValue({
            data: {
                entities: [{ id: '1', name: 'Entity1', type: 'case' }],
                links: [],
            },
        });
        const { findByText } = render(<GraphComponent />);
        const nodeLabel = await findByText('Entity1');
        expect(nodeLabel).toBeInTheDocument();
    });

    it('filters graph on search', async () => {
        getGraphData.mockResolvedValue({
            data: {
                entities: [
                    { id: '1', name: 'Entity1', type: 'case' },
                    { id: '2', name: 'Entity2', type: 'actor' },
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
        fireEvent.change(searchInput, { target: { value: 'Entity2' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
        const nodeLabel = await queryByText('Entity2');
        expect(nodeLabel).toBeInTheDocument();
        expect(await queryByText('Entity1')).not.toBeInTheDocument();
    });
});
