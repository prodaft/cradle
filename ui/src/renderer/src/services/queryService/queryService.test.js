import { queryEntries } from './queryService';
import qs from 'qs';
import { authAxios as axios } from '../axiosInstance/axiosInstance';
jest.mock('../axiosInstance/axiosInstance', () => ({
    authAxios: jest.fn(),
}));

jest.mock('axios');

describe('queryEntries', () => {
    const name = 'testName';
    const entryTypes = ['type1', 'type2'];
    const artifactSubtypes = ['artifact1', 'artifact2'];

    beforeEach(() => {
        axios.mockClear();
    });

    it('should send a GET request with correct parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await queryEntries(name, entryTypes, artifactSubtypes);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: '/query/',
            params: {
                entryType: entryTypes,
                entrySubtype: artifactSubtypes,
                name: name,
            },
            paramsSerializer: expect.any(Function),
        });
    });

    it('should correctly serialize array parameters', async () => {
        axios.mockResolvedValue({ data: {} });

        await queryEntries(name, entryTypes, artifactSubtypes);

        const paramsSerializer = axios.mock.calls[0][0].paramsSerializer;
        const serializedParams = paramsSerializer({
            entryType: entryTypes,
            entrySubtype: artifactSubtypes,
            name: name,
        });

        expect(serializedParams).toBe(
            qs.stringify(
                {
                    entryType: entryTypes,
                    entrySubtype: artifactSubtypes,
                    name: name,
                },
                { arrayFormat: 'repeat' },
            ),
        );
    });

    it('should return the response data', async () => {
        const responseData = { data: 'testData' };
        axios.mockResolvedValue(responseData);

        const result = await queryEntries(name, entryTypes, artifactSubtypes);

        expect(result).toBe(responseData);
    });

    it('should throw an error if the request fails', async () => {
        const error = new Error('testError');
        axios.mockRejectedValue(error);

        await expect(queryEntries(name, entryTypes, artifactSubtypes)).rejects.toThrow(
            error,
        );
    });
});
