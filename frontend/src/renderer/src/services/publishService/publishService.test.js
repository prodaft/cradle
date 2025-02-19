import { getPublishData } from './publishService';
import { authAxios as axios } from '../axiosInstance/axiosInstance';
jest.mock('../axiosInstance/axiosInstance', () => ({
    authAxios: jest.fn(),
}));
jest.mock('axios');

describe('getPublishData', () => {
    const noteIds = [1, 2, 3];

    beforeEach(() => {
        axios.mockClear();
    });

    it('sends a GET request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await getPublishData(noteIds);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: '/notes/publish/',
            params: { note_ids: noteIds },
            paramsSerializer: expect.any(Function),
        });
    });

    it('returns the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await getPublishData(noteIds);

        expect(result).toBe(responseData);
    });

    it('throws an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(getPublishData(noteIds)).rejects.toThrow(error);
    });
});
