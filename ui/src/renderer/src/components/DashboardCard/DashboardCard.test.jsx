/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import * as ReactRouterDom from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import DashboardCard from './DashboardCard';
import '@testing-library/jest-dom';

// Mock the entire module first
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

describe('DashboardCard component', () => {
    const name = 'Test Card';
    const index = 1;
    const link = '/test-link';
    const type = 'Test Type';

    it('renders card name and type', () => {
        render(
            <MemoryRouter>
                <DashboardCard name={name} index={index} link={link} type={type} />
            </MemoryRouter>,
        );

        expect(screen.getByText('Test Card')).toBeInTheDocument();
        expect(screen.getByText('Test Type')).toBeInTheDocument();
    });

    it('navigates to link on click when link is provided', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardCard name={name} index={index} link={link} type={type} />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByText('Test Card'));
        expect(navigate).toHaveBeenCalledWith(link);
    });

    it('does not navigate on click when link is not provided', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardCard name={name} index={index} type={type} />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByText('Test Card'));
        expect(navigate).not.toHaveBeenCalled();
    });

    it('renders card without type when type is not provided', () => {
        render(
            <MemoryRouter>
                <DashboardCard name={name} index={index} link={link} />
            </MemoryRouter>,
        );

        expect(screen.getByText('Test Card')).toBeInTheDocument();
        expect(screen.queryByText('Test Type')).not.toBeInTheDocument();
    });
});
