import axios from '../axiosInstance/axiosInstance';
import MockAdapter from 'axios-mock-adapter';
import { getGraphData } from './graphService';

describe('graphService', () => {
    let mock;

    beforeEach(() => {
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    it('returns data when getGraphData is called', async () => {
        const data = { graphData: 'test' };
        mock.onGet('/knowledge-graph/').reply(200, data);

        const response = await getGraphData();
        expect(response.data).toEqual(data);
    });

    it('throws an error when getGraphData is called and the server responds with 500', async () => {
        mock.onGet('/knowledge-graph/').reply(500);

        await expect(getGraphData()).rejects.toThrow();
    });

    it('sends a request with the correct headers when getGraphData is called', async () => {
        mock.onGet('/knowledge-graph/').reply((config) => {
            expect(config.headers['Content-Type']).toEqual('application/json');
            return [200, {}];
        });

        await getGraphData();
    });
});
