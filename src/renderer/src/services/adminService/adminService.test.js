import { createActor, createCase, getActors, getCases, getUsers, deleteEntity } from './adminService';
import axios from 'axios';
jest.mock('axios');

describe('Admin Service', () => {
    const token = 'testToken';
    const data = { name: 'test' };
    const id = 1;
    const type = 'entities';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates an actor successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await createActor(data, token);
        expect(axios).toHaveBeenCalledWith({
            method: "post",
            url: "/entities/actors/",
            data: data,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
    });

    it('creates a case successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await createCase(data, token);
        expect(axios).toHaveBeenCalledWith({
            method: "post",
            url: "/entities/cases/",
            data: data,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
    });

    it('gets actors successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getActors(token);
        expect(axios).toHaveBeenCalledWith({
            method: "get",
            url: "/entities/actors/",
            headers: { "Authorization": `Bearer ${token}` }
        });
    });

    it('gets cases successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getCases(token);
        expect(axios).toHaveBeenCalledWith({
            method: "get",
            url: "/entities/cases/",
            headers: { "Authorization": `Bearer ${token}` }
        });
    });

    it('gets users successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await getUsers(token);
        expect(axios).toHaveBeenCalledWith({
            method: "get",
            url: "/users/",
            headers: { "Authorization": `Bearer ${token}` }
        });
    });

    it('deletes an entity successfully', async () => {
        axios.mockResolvedValue({ data: {} });
        await deleteEntity(token, type, id);
        expect(axios).toHaveBeenCalledWith({
            method: "delete",
            url: `/${type}/${id}/`,
            headers: { "Authorization": `Bearer ${token}` }
        });
    });
});