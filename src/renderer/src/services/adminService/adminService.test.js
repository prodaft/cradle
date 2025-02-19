import {
    changeAccess,
    createActor,
    createEntity,
    deleteEntry,
    getActors,
    getEntities,
    getPermissions,
    getUsers,
} from './adminService';
import * as axios from '../axiosInstance/axiosInstance';
jest.mock('../axiosInstance/axiosInstance');

describe('Admin Service', () => {
    const data = { name: 'test' };
    const id = 1;
    const type = 'entries';
    const accessLevel = 'read';
    const userId = '1';
    const entityId = '1';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates an actor successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await createActor(data);
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'post',
            url: '/entries/actors/',
            data: data,
        });
    });

    it('creates an entity successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await createEntity(data);
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'post',
            url: '/entries/entities/',
            data: data,
        });
    });

    it('gets actors successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await getActors();
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'get',
            url: '/entries/actors/',
        });
    });

    it('gets entities successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await getEntities();
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'get',
            url: '/entries/entities/',
        });
    });

    it('gets users successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await getUsers();
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'get',
            url: '/users/',
        });
    });

    it('deletes an entry successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await deleteEntry(type, id);
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'delete',
            url: `/${type}/${id}/`,
        });
    });

    it('changes access level successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await changeAccess(userId, entityId, accessLevel);
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'put',
            url: `/access/${userId}/${entityId}/`,
            data: { access_type: accessLevel },
        });
    });

    it('gets permissions successfully', async () => {
        axios.authAxios.mockResolvedValue({ data: {} });
        await getPermissions(userId);
        expect(axios.authAxios).toHaveBeenCalledWith({
            method: 'get',
            url: `/access/${userId}/`,
        });
    });
});
