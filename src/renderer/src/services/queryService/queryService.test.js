import { queryEntities } from './queryService';
import axios from '../axiosInstance/axiosInstance';
import qs from 'qs';

jest.mock('axios');

describe('queryEntities', () => {
    const name = 'testName';
    const entityTypes = ['type1', 'type2'];
    const entrySubtypes = ['entry1', 'entry2'];

    beforeEach(() => {
        axios.get.mockClear();
    });

    it('should send a GET request with correct parameters', async () => {
        axios.get.mockResolvedValue({ data: {} });

        await queryEntities(name, entityTypes, entrySubtypes);

        expect(axios.get).toHaveBeenCalledWith('/query/', {
            params: {
                entityType: entityTypes,
                entitySubtype: entrySubtypes,
                name: name,
            },
            paramsSerializer: expect.any(Function),
        });
    });

    it('should correctly serialize array parameters', async () => {
        axios.get.mockResolvedValue({ data: {} });

        await queryEntities(name, entityTypes, entrySubtypes);

        const paramsSerializer = axios.get.mock.calls[0][1].paramsSerializer;
        const serializedParams = paramsSerializer({
            entityType: entityTypes,
            entitySubtype: entrySubtypes,
            name: name,
        });

        expect(serializedParams).toBe(
            qs.stringify(
                {
                    entityType: entityTypes,
                    entitySubtype: entrySubtypes,
                    name: name,
                },
                { arrayFormat: 'repeat' },
            ),
        );
    });

    it('should return the response data', async () => {
        const responseData = { data: 'testData' };
        axios.get.mockResolvedValue(responseData);

        const result = await queryEntities(name, entityTypes, entrySubtypes);

        expect(result).toBe(responseData);
    });

    it('should throw an error if the request fails', async () => {
        const error = new Error('testError');
        axios.get.mockRejectedValue(error);

        await expect(queryEntities(name, entityTypes, entrySubtypes)).rejects.toThrow(
            error,
        );
    });
});
