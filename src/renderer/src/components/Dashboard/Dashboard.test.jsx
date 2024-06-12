/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import { getDashboardData } from '../../services/dashboardService/dashboardService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import '@testing-library/jest-dom';

// Mock the dependencies
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn(),
}));

jest.mock('../../services/dashboardService/dashboardService');
jest.mock('../../hooks/useAuth/useAuth');
jest.mock('../../hooks/useNavbarContents/useNavbarContents');

window.HTMLElement.prototype.scrollTo = () => {};

describe('Dashboard Component', () => {
    beforeEach(() => {
        useLocation.mockReturnValue({ pathname: '/dashboard', search: '' });
        useAuth.mockReturnValue({ access: 'token' });
    });

    it('renders without crashing when case data is present', () => {
        getDashboardData.mockResolvedValue({ data: { case: {} } });

        render(
            <Router>
                <Dashboard />
            </Router>,
        );
    });

    it('does not display case data when a 404 error occurs', async () => {
        getDashboardData.mockRejectedValue({ response: { status: 404 } });

        render(
            <Router>
                <Dashboard />
            </Router>,
        );

        await waitFor(() => expect(getDashboardData).toHaveBeenCalledTimes(1));

        expect(screen.queryByText('Test Case')).not.toBeInTheDocument();
    });

    it('displays case data correctly when fetched successfully', async () => {
        const mockData = {
            name: 'Test Case',
            description: 'This is a test case.',
            type: 'case',
            actors: [{ name: 'Actor 1' }],
            cases: [{ name: 'Case 1' }],
            metadata: [{ name: 'Metadata 1' }],
            notes: [{ content: 'Note 1', entities: [] }],
        };
        getDashboardData.mockResolvedValue({ data: mockData });

        render(
            <Router>
                <Dashboard />
            </Router>,
        );

        await waitFor(() => expect(getDashboardData).toHaveBeenCalledTimes(1));

        expect(await screen.findByText('Test Case')).toBeInTheDocument();
        expect(await screen.findByText('Type: case')).toBeInTheDocument();
        expect(
            await screen.findByText('Description: This is a test case.'),
        ).toBeInTheDocument();
        expect(await screen.findByText('Actor 1')).toBeInTheDocument();
        expect(await screen.findByText('Case 1')).toBeInTheDocument();
        expect(await screen.findByText('Metadata 1')).toBeInTheDocument();
        expect(await screen.findByText('Note 1')).toBeInTheDocument();
    });

    it('displays error message when entity is missing', async () => {
        getDashboardData.mockRejectedValue({ response: { status: 404 } });

        render(
            <Router>
                <Dashboard />
            </Router>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('not-found')).toBeInTheDocument(),
        );
    });
});
