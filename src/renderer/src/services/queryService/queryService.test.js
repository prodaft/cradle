import { queryEntities } from './queryService';
import axios from 'axios';
import qs from 'qs';

jest.mock('axios');

describe('queryEntities', () => {
    const token = 'testToken';
    const name = 'testName';
    const entityTypes = ['type1', 'type2'];
    const entryTypes = ['entry1', 'entry2'];

    beforeEach(() => {
        axios.get.mockClear();
    });

    it('should send a GET request with correct parameters', async () => {
        axios.get.mockResolvedValue({ data: {} });

        await queryEntities(token, name, entityTypes, entryTypes);

        expect(axios.get).toHaveBeenCalledWith('/query/', {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            params: {
                entityType: entityTypes,
                entitySubtype: entryTypes,
                name: name,
            },
            paramsSerializer: expect.any(Function),
        });
    });

    it('should correctly serialize array parameters', async () => {
        axios.get.mockResolvedValue({ data: {} });

        await queryEntities(token, name, entityTypes, entryTypes);

        const paramsSerializer = axios.get.mock.calls[0][1].paramsSerializer;
        const serializedParams = paramsSerializer({
            entityType: entityTypes,
            entitySubtype: entryTypes,
            name: name,
        });

        expect(serializedParams).toBe(
            qs.stringify(
                {
                    entityType: entityTypes,
                    entitySubtype: entryTypes,
                    name: name,
                },
                { arrayFormat: 'repeat' },
            ),
        );
    });

    it('should return the response data', async () => {
        const responseData = { data: 'testData' };
        axios.get.mockResolvedValue(responseData);

        const result = await queryEntities(token, name, entityTypes, entryTypes);

        expect(result).toBe(responseData);
    });

    it('should throw an error if the request fails', async () => {
        const error = new Error('testError');
        axios.get.mockRejectedValue(error);

        await expect(
            queryEntities(token, name, entityTypes, entryTypes),
        ).rejects.toThrow(error);
    });
});
