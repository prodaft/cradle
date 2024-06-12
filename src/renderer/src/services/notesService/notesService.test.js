import { getNote, setPublishable } from './notesService';
import axios from 'axios';

jest.mock('axios');

it('fetches note successfully from API', async () => {
    const data = {
        data: { title: 'Test Note', content: 'This is a test note.' },
    };
    axios.mockImplementationOnce(() => Promise.resolve(data));

    await expect(getNote('dummy_token', '1')).resolves.toEqual(data);

    expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: `/notes/1/`,
        headers: { Authorization: `Bearer dummy_token` },
    });
});

it('fetches note unsuccessfully from API', async () => {
    const errorMessage = 'Network Error';
    axios.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

    await expect(getNote('dummy_token', '1')).rejects.toThrow(errorMessage);
});

describe('setPublishable', () => {
    const token = 'testToken';
    const noteId = 123;
    const status = true;

    beforeEach(() => {
        axios.mockClear();
    });

    it('sends a PUT request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await setPublishable(token, noteId, status);

        expect(axios).toHaveBeenCalledWith({
            method: 'PUT',
            url: `/notes/${noteId}/publishable/`,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: {
                publishable: status,
            },
        });
    });

    it('returns the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await setPublishable(token, noteId, status);

        expect(result).toBe(responseData);
    });

    it('throws an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(setPublishable(token, noteId, status)).rejects.toThrow(error);
    });
});
