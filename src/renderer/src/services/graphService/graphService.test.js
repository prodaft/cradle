import axios from 'axios';
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

        const response = await getGraphData('token');
        expect(response.data).toEqual(data);
    });

    it('throws an error when getGraphData is called and the server responds with 500', async () => {
        mock.onGet('/knowledge-graph/').reply(500);

        await expect(getGraphData('token')).rejects.toThrow();
    });

    it('sends a request with the correct headers when getGraphData is called', async () => {
        const token = 'token';
        mock.onGet('/knowledge-graph/').reply((config) => {
            expect(config.headers['Content-Type']).toEqual('application/json');
            expect(config.headers['Authorization']).toEqual(`Bearer ${token}`);
            return [200, {}];
        });

        await getGraphData(token);
    });
});
