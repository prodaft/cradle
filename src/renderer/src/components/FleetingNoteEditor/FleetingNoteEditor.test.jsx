/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react';
import FleetingNoteEditor from './FleetingNoteEditor';
import { useAuth } from '../../hooks/useAuth/useAuth';
import {useLocation, useNavigate, useOutletContext, useParams} from 'react-router-dom';
import { deleteFleetingNote, getFleetingNoteById, updateFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth');

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
    useLocation: jest.fn(),
    useOutletContext: jest.fn(),
    useParams: jest.fn(),
}));

jest.mock('../../services/fleetingNotesService/fleetingNotesService');

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

jest.mock('../../hooks/useNavbarContents/useNavbarContents', () => () => { });

describe('FleetingNoteEditor', () => {
    const noteId = '1';
    const noteContent = 'Test note content';

    beforeEach(() => {
        useOutletContext.mockReturnValue({refreshFleetingNotes: jest.fn()});
        useAuth.mockReturnValue({ access: 'access-token' });
        getFleetingNoteById.mockResolvedValue({ data: { content: noteContent } });
        useParams.mockReturnValue({ id: '1' });
        updateFleetingNote.mockResolvedValue({ status: 200 });
        deleteFleetingNote.mockResolvedValue({ status: 200 });
    });

    it('fetches and displays the note content on load', async () => {
        const { findByText } = render(<FleetingNoteEditor />);
        expect(await findByText(noteContent)).toBeInTheDocument();
    });
});