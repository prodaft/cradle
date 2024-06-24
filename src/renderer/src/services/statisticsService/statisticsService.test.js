import MockAdapter from 'axios-mock-adapter';
import { getStatistics } from './statisticsService';
import { authAxios as axios } from '../axiosInstance/axiosInstance';

const mock = new MockAdapter(axios);

describe('getStatistics', () => {
    afterEach(() => {
        mock.reset();
    });

    it('should return statistics data', async () => {
        const responseData = { actors: [], cases: [], notes: [] };
        mock.onGet('/statistics/').reply(200, responseData);

        const response = await getStatistics();

        expect(response.status).toBe(200);
        expect(response.data).toEqual(responseData);
    });

    it('should handle API error', async () => {
        mock.onGet('/statistics/').reply(500);

        try {
            await getStatistics();
        } catch (error) {
            expect(error.message).toBe('Request failed with status code 500');
        }
    });
});
