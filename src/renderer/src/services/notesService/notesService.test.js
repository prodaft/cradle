import { getNote, setPublishable, deleteNote } from './notesService';
import { authAxios as axios } from '../axiosInstance/axiosInstance';
jest.mock('../axiosInstance/axiosInstance', () => ({
    authAxios: jest.fn(),
}));
jest.mock('axios');

it('fetches note successfully from API', async () => {
    const data = {
        data: { title: 'Test Note', content: 'This is a test note.' },
    };
    axios.mockImplementationOnce(() => Promise.resolve(data));

    await expect(getNote('1')).resolves.toEqual(data);

    expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: `/notes/1/`,
    });
});

it('fetches note unsuccessfully from API', async () => {
    const errorMessage = 'Network Error';
    axios.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

    await expect(getNote('1')).rejects.toThrow(errorMessage);
});

describe('setPublishable', () => {
    const noteId = 123;
    const status = true;

    beforeEach(() => {
        axios.mockClear();
    });

    it('sends a PUT request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await setPublishable(noteId, status);

        expect(axios).toHaveBeenCalledWith({
            method: 'PUT',
            url: `/notes/${noteId}/publishable/`,
            data: {
                publishable: status,
            },
        });
    });

    it('returns the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await setPublishable(noteId, status);

        expect(result).toBe(responseData);
    });

    it('throws an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(setPublishable(noteId, status)).rejects.toThrow(error);
    });
});

it('deletes note successfully from API', async () => {
    const id = '1';

    axios.mockResolvedValue({ data: {} });

    await expect(deleteNote(id)).resolves.toEqual({ data: {} });

    expect(axios).toHaveBeenCalledWith({
        method: 'DELETE',
        url: `/notes/${id}/`,
    });
});

it('deletes note unsuccessfully from API', async () => {
    const id = '1';
    const errorMessage = 'Network Error';

    axios.mockRejectedValue(new Error(errorMessage));

    await expect(deleteNote(id)).rejects.toThrow(errorMessage);
});
