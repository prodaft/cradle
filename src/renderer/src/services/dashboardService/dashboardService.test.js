import { getDashboardData } from './dashboardService';
import { setPublishable } from '../notesService/notesService';
import axios from 'axios';

jest.mock('axios');

describe('getDashboardData', () => {
    const token = 'testToken';
    const path = '/testPath';

    beforeEach(() => {
        axios.mockClear();
    });

    it('sends a GET request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await getDashboardData(token, path);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: path,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
    });

    it('returns the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await getDashboardData(token, path);

        expect(result).toBe(responseData);
    });

    it('throws an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(getDashboardData(token, path)).rejects.toThrow(error);
    });
});
