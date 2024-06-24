/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import AdminPanel from '../AdminPanel/AdminPanel';
import { useAuth } from '../../hooks/useAuth/useAuth';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { isAdmin: true };
    }),
}));

jest.mock('../../services/adminService/adminService', () => ({
    getActors: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', name: 'Test Actor', description: 'Test Description' }],
    }),
    getCases: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', name: 'Test Case', description: 'Test Description' }],
    }),
    getUsers: jest.fn().mockResolvedValue({
        status: 200,
        data: [{ id: '1', username: 'Test User' }],
    }),
}));

describe('AdminPanel', () => {
    it('should display actors, cases, and users when user is admin', async () => {
        const { findByText } = render(
            <MemoryRouter>
                <AdminPanel />
            </MemoryRouter>,
        );
        expect(await findByText('Test Actor')).toBeInTheDocument();
        expect(await findByText('Test Case')).toBeInTheDocument();
        expect(await findByText('Test User')).toBeInTheDocument();
    });

    it('should not display actors, cases, and users when user is not admin', async () => {
        useAuth.mockImplementation(() => ({
            isAdmin: false,
        }));
        const { queryByText } = render(
            <MemoryRouter>
                <AdminPanel />
            </MemoryRouter>,
        );
        expect(queryByText('Test Actor')).not.toBeInTheDocument();
        expect(queryByText('Test Case')).not.toBeInTheDocument();
        expect(queryByText('Test User')).not.toBeInTheDocument();
    });
});
