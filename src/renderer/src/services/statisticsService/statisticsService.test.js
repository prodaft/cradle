import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { getStatistics } from './statisticsService';

const mock = new MockAdapter(axios);
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

describe('getStatistics', () => {
    afterEach(() => {
        mock.reset();
    });

    it('should return statistics data', async () => {
        const token = 'your-jwt-token';
        const responseData = { actors: [], cases: [], notes: [] };
        mock.onGet('/statistics/').reply(200, responseData);

        const response = await getStatistics(token);

        expect(response.status).toBe(200);
        expect(response.data).toEqual(responseData);
    });

    it('should handle API error', async () => {
        const token = 'your-jwt-token';
        const errorMessage = 'API error';
        mock.onGet('/statistics/').reply(500);

        try {
            await getStatistics(token);
        } catch (error) {
            expect(error.message).toBe('Request failed with status code 500');
        }
    });
});
