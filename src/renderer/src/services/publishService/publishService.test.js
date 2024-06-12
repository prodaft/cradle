import { getPublishData } from './publishService';
import axios from 'axios';

jest.mock('axios');

describe('getPublishData', () => {
    const token = 'testToken';
    const noteIds = [1, 2, 3];

    beforeEach(() => {
        axios.mockClear();
    });

    it('sends a GET request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await getPublishData(token, noteIds);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: '/notes/publish',
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            params: { note_ids: noteIds },
            paramsSerializer: expect.any(Function),
        });
    });

    it('returns the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await getPublishData(token, noteIds);

        expect(result).toBe(responseData);
    });

    it('throws an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(getPublishData(token, noteIds)).rejects.toThrow(error);
    });
});
