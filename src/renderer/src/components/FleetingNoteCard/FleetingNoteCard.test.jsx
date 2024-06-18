/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react';
import FleetingNoteCard from './FleetingNoteCard';
import { useNavigate } from 'react-router-dom';
import { deleteFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));

jest.mock('../../services/fleetingNotesService/fleetingNotesService', () => ({
    deleteFleetingNote: jest.fn(),
}));

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn(() => ({ access: 'access-token ' })),
}));

describe('FleetingNoteCard', () => {
    const note = {
        id: '1',
        content: 'Test note',
        last_edited: new Date().toISOString(),
    };

    const setAlert = jest.fn();

    beforeEach(() => {
        useNavigate.mockReturnValue(jest.fn());
        deleteFleetingNote.mockResolvedValue({ status: 200 });
    });

    it('renders the note content', async () => {
        const { findByText } = render(
            <FleetingNoteCard note={note} setAlert={setAlert} />,
        );
        expect(await findByText('Test note')).toBeInTheDocument();
    });

    it('navigates on click', async () => {
        const navigate = jest.fn();
        useNavigate.mockReturnValue(navigate);

        const { findByText } = render(
            <FleetingNoteCard note={note} setAlert={setAlert} />,
        );
        fireEvent.click(await findByText('Test note'));

        expect(navigate).toHaveBeenCalledWith('/fleeting-editor/' + note.id);
    });
});
