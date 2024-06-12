import axios from 'axios';
import {
    getFleetingNotes,
    addFleetingNote,
    updateFleetingNote,
    deleteFleetingNote,
} from './fleetingNotesService';

jest.mock('axios');

describe('Fleeting Notes Service', () => {
    const token = 'testToken';
    const content = 'testContent';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('fetches fleeting notes successfully', async () => {
        const response = {
            data: [
                { id: 1, content: 'Note 1' },
                { id: 2, content: 'Note 2' },
            ],
        };
        axios.mockResolvedValue(response);

        const result = await getFleetingNotes(token);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: '/fleeting-notes/',
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        expect(result).toEqual(response);
    });

    it('throws error when fetching fleeting notes fails', async () => {
        const error = new Error('Network Error');
        axios.mockRejectedValue(error);

        await expect(getFleetingNotes(token)).rejects.toThrow('Network Error');
    });

    it('adds a fleeting note successfully', async () => {
        const response = { data: { id: 1, content: 'Note 1' } };
        axios.mockResolvedValue(response);

        const result = await addFleetingNote(token, content);

        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: '/fleeting-notes/',
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: { content: content },
        });
        expect(result).toEqual(response);
    });

    it('throws error when adding a fleeting note fails', async () => {
        const error = new Error('Network Error');
        axios.mockRejectedValue(error);

        await expect(addFleetingNote(token, content)).rejects.toThrow('Network Error');
    });

    it('updates a fleeting note successfully', async () => {
        const id = 1;
        const response = { data: { id: 1, content: 'Note 1' } };
        axios.mockResolvedValue(response);

        const result = await updateFleetingNote(token, id, content);

        expect(axios).toHaveBeenCalledWith({
            method: 'PUT',
            url: `/fleeting-notes/${id}/`,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: { content: content },
        });
        expect(result).toEqual(response);
    });

    it('throws error when updating a fleeting note fails', async () => {
        const id = 1;
        const error = new Error('Network Error');
        axios.mockRejectedValue(error);

        await expect(updateFleetingNote(token, id, content)).rejects.toThrow(
            'Network Error',
        );
    });

    it('deletes a fleeting note successfully', async () => {
        const id = 1;
        const response = { data: { id: 1, content: 'Note 1' } };
        axios.mockResolvedValue(response);

        const result = await deleteFleetingNote(token, id);

        expect(axios).toHaveBeenCalledWith({
            method: 'DELETE',
            url: `/fleeting-notes/${id}/`,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        expect(result).toEqual(response);
    });

    it('save a fleeting note as final successfully', async () => {
        const id = 1;
        const response = { data: { id: 1, content: 'Note 1' } };
        axios.mockResolvedValue(response);

        const result = await updateFleetingNote(token, id, content);

        expect(axios).toHaveBeenCalledWith({
            method: 'PUT',
            url: `/fleeting-notes/${id}/`,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: { content: content },
        });
        expect(result).toEqual(response);
    });

    it('throws error when saving a fleeting note as final fails', async () => {
        const id = 1;
        const error = new Error('Network Error');
        axios.mockRejectedValue(error);

        await expect(updateFleetingNote(token, id, content)).rejects.toThrow(
            'Network Error',
        );
    });
});
