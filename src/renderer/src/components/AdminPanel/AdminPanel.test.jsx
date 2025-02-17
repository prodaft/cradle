/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import AdminPanel from '../AdminPanel/AdminPanel';
import useAuth from '../../hooks/useAuth/useAuth';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    default: () => {
        isAdmin(): true;
    },
}));

jest.mock('../../services/adminService/adminService', () => ({
    getActors: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', name: 'Test Actor', description: 'Test Description' }],
    }),
    getEntities: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', name: 'Test Entity', description: 'Test Description' }],
    }),
    getUsers: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', username: 'Test User' }],
    }),
}));

describe('AdminPanel', () => {
    it('should display actors, entities, and users when user is admin', async () => {
        const { findByText } = render(
            <MemoryRouter>
                <AdminPanel />
            </MemoryRouter>,
        );
        expect(await findByText('Test Actor')).toBeInTheDocument();
        expect(await findByText('Test Entity')).toBeInTheDocument();
        expect(await findByText('Test User')).toBeInTheDocument();
    });

    it('should not display actors, entities, and users when user is not admin', async () => {
        jest.mock('../../hooks/useAuth/useAuth', () => ({
            default: () => {
                isAdmin(): false;
            },
        }));
        const { queryByText } = render(
            <MemoryRouter>
                <AdminPanel />
            </MemoryRouter>,
        );
        expect(queryByText('Test Actor')).not.toBeInTheDocument();
        expect(queryByText('Test Entity')).not.toBeInTheDocument();
        expect(queryByText('Test User')).not.toBeInTheDocument();
    });
});
