import {
    changeAccess,
    createActor,
    createCase,
    deleteEntity,
    getActors,
    getCases,
    getPermissions,
    getUsers,
} from './adminService';
import axios from '../axiosInstance/axiosInstance';
jest.mock('axios');

describe('Admin Service', () => {
    const data = { name: 'test' };
    const id = 1;
    const type = 'entities';
    const accessLevel = 'read';
    const userId = '1';
    const caseId = '1';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates an actor successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await createActor(data);
        expect(axios).toHaveBeenCalledWith({
            method: 'post',
            url: '/entities/actors/',
            data: data,
        });
    });

    it('creates a case successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await createCase(data);
        expect(axios).toHaveBeenCalledWith({
            method: 'post',
            url: '/entities/cases/',
            data: data,
        });
    });

    it('gets actors successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getActors();
        expect(axios).toHaveBeenCalledWith({
            method: 'get',
            url: '/entities/actors/',
        });
    });

    it('gets cases successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getCases();
        expect(axios).toHaveBeenCalledWith({
            method: 'get',
            url: '/entities/cases/',
        });
    });

    it('gets users successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getUsers();
        expect(axios).toHaveBeenCalledWith({
            method: 'get',
            url: '/users/',
        });
    });

    it('deletes an entity successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await deleteEntity(type, id);
        expect(axios).toHaveBeenCalledWith({
            method: 'delete',
            url: `/${type}/${id}/`,
        });
    });

    it('changes access level successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await changeAccess(userId, caseId, accessLevel);
        expect(axios).toHaveBeenCalledWith({
            method: 'put',
            url: `/access/${userId}/${caseId}/`,
            data: { access_type: accessLevel },
        });
    });

    it('gets permissions successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getPermissions(userId);
        expect(axios).toHaveBeenCalledWith({
            method: 'get',
            url: `/access/${userId}/`,
        });
    });
});
