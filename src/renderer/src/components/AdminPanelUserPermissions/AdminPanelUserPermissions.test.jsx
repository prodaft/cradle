/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import AdminPanelUserPermissions from './AdminPanelUserPermissions.jsx';
import { getPermissions } from '../../services/adminService/adminService';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../services/adminService/adminService');

describe('AdminPanelUserPermissions', () => {
    it('should display user permissions when user has permissions', async () => {
        getPermissions.mockResolvedValue({
            status: 200,
            data: [{ id: '1', name: 'Test Case', access_type: 'read' }],
        });
        const { findByText } = render(
            <MemoryRouter initialArtifacts={['/user/1']}>
                <Routes>
                    <Route
                        path='/user/:id'
                        element={<AdminPanelUserPermissions />}
                    ></Route>
                </Routes>
            </MemoryRouter>,
        );
        expect(await findByText('Test Case')).toBeInTheDocument();
    });

    it('should not display user permissions when user has no permissions', async () => {
        getPermissions.mockResolvedValue({ status: 200, data: [] });
        const { queryByText } = render(
            <MemoryRouter initialArtifacts={['/user/1']}>
                <Routes>
                    <Route
                        path='/user/:id'
                        element={<AdminPanelUserPermissions />}
                    ></Route>
                </Routes>
            </MemoryRouter>,
        );
        expect(queryByText('Test Case')).not.toBeInTheDocument();
    });
});
