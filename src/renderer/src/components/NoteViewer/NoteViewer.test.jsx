/*
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getNote } from '../../services/notesService/notesService';
import NoteViewer from './NoteViewer';
import useAuth from '../../hooks/useAuth/useAuth';
import '@testing-library/jest-dom';

jest.mock('../../services/notesService/notesService');
jest.mock('../../hooks/useAuth/useAuth');
jest.mock('../../hooks/useNavbarContents/useNavbarContents');

beforeEach(() => {
    jest.resetAllMocks();
});

describe('NoteViewer', () => {
    it('displays note content and timestamp when fetched successfully', async () => {
        const mockNote = {
            data: { content: 'Test Note', timestamp: '2022-01-01T00:00:00Z' },
        };
        getNote.mockResolvedValueOnce(mockNote);
        const date = new Date('2022-01-01T00:00:00Z').toLocaleString();

        render(<NoteViewer />, { wrapper: MemoryRouter });

        await waitFor(() => expect(screen.getByText('Test Note')).toBeInTheDocument());
        expect(screen.getByText(date)).toBeInTheDocument();
    });

    it('displays error message when note fetch fails', async () => {
        getNote.mockRejectedValueOnce(new Error('Network Error'));

        console.error = jest.fn();

        render(<NoteViewer />, { wrapper: MemoryRouter });

        await waitFor(() =>
            expect(screen.getByText('Network Error')).toBeInTheDocument(),
        );
    });
});
