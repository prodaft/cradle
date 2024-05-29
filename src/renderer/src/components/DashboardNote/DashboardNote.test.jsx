/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardNote from './DashboardNote';
import '@testing-library/jest-dom';
import * as ReactRouterDom from 'react-router-dom';

// Mock the entire module first
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: true };
    }),
}));

describe('DashboardNote component', () => {
    const note = {
        id: '1',
        timestamp: new Date().toISOString(),
        content: 'Test Note',
        entities: [{ name: 'Test Entity' }]
    };

    it('renders note content and entities', () => {
        render(
            <MemoryRouter>
                <DashboardNote index={0} note={note} />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Note')).toBeInTheDocument();
        expect(screen.getByText('Test Entity;')).toBeInTheDocument();
    });


    it('navigates to note detail page on note click', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote index={0} note={note} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText('Test Note'));
        expect(navigate).toHaveBeenCalledWith(`/notes/${note.id}`);
    });

    it('does not navigate when checkbox is clicked', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote index={0} note={note} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('checkbox'));
        expect(navigate).not.toHaveBeenCalled();
    });

    it('renders note timestamp correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote index={0} note={note} />
            </MemoryRouter>
        );

        expect(screen.getByText(new Date(note.timestamp).toLocaleString())).toBeInTheDocument();
    });

    it('renders note entities correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote index={0} note={note} />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Entity;')).toBeInTheDocument();
    });
});

