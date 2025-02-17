/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import * as ReactRouterDom from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import DashboardNote from './DashboardNote';
import '@testing-library/jest-dom';

// Mock the entire module first
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { isAdmin(): true };
    }),
}));

describe('DashboardNote', () => {
    const selectedNoteIds = new Array();
    const note = {
        id: 1,
        timestamp: new Date().getTime(),
        content: 'This is a test note',
        entries: [
            { id: 1, name: 'Entry 1' },
            { id: 2, name: 'Entry 2' },
        ],
        publishable: true,
    };

    const setAlert = jest.fn();
    const setSelectedNoteIds = jest.fn();

    test('renders note content', async () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={false}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        const noteContent = await screen.findByText('This is a test note');
        expect(noteContent).toBeInTheDocument();
    });

    it('renders note content and entries', async () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={true}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        expect(await screen.findByText('This is a test note')).toBeInTheDocument();
        expect(await screen.findByText('Entry 1')).toBeInTheDocument();
        expect(await screen.findByText('Entry 2')).toBeInTheDocument();
    });

    it('navigates to note detail page on note click', async () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={true}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByText('This is a test note'));
        expect(navigate).toHaveBeenCalledWith(`/notes/${note.id}`, expect.any(Object));
    });

    it('does not navigate when checkbox is clicked', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={true}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('checkbox'));
        expect(navigate).not.toHaveBeenCalled();
    });

    it('renders note timestamp correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={true}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        expect(
            screen.getByText(new Date(note.timestamp).toLocaleString()),
        ).toBeInTheDocument();
    });

    it('renders note entries correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    publishMode={true}
                    selectedNoteIds={selectedNoteIds}
                    setSelectedNoteIds={setSelectedNoteIds}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('Entry 1')).toBeInTheDocument();
        expect(screen.getByText('Entry 2')).toBeInTheDocument();
    });
});
