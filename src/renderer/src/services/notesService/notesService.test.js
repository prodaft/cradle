import { getNote } from './notesService';
import axios from 'axios';

jest.mock('axios');

it('fetches note successfully from API', async () => {
    const data = {
        data: { title: 'Test Note', content: 'This is a test note.' },
    };
    axios.mockImplementationOnce(() => Promise.resolve(data));

    await expect(getNote('dummy_token', '1')).resolves.toEqual(data);

    expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: `/notes/1`,
        headers: { Authorization: `Bearer dummy_token` },
    });
});

it('fetches note unsuccessfully from API', async () => {
    const errorMessage = 'Network Error';
    axios.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

    await expect(getNote('dummy_token', '1')).rejects.toThrow(errorMessage);
});
