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
    useAuth: jest.fn(() => ({ access : 'access-token '}))
}));

describe('FleetingNoteCard', () => {
    const note = {
        id: '1',
        content: 'Test note',
        last_edited: new Date().toISOString(),
    };

    const setAlert = jest.fn();
    const setAlertColor = jest.fn();

    beforeEach(() => {
        useNavigate.mockReturnValue(jest.fn());
        deleteFleetingNote.mockResolvedValue({ status: 200 });
    });

    it('renders the note content', () => {
        const { getByText } = render(<FleetingNoteCard note={note} setAlert={setAlert} setAlertColor={setAlertColor} />);
        expect(getByText('Test note')).toBeInTheDocument();
    });

    it('navigates on click', () => {
        const navigate = jest.fn();
        useNavigate.mockReturnValue(navigate);

        const { getByText } = render(<FleetingNoteCard note={note} setAlert={setAlert} setAlertColor={setAlertColor} />);
        fireEvent.click(getByText('Test note'));

        expect(navigate).toHaveBeenCalledWith('/fleeting-editor/' + note.id );
    });
});