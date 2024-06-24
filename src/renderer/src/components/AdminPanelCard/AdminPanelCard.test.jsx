/**
 * @jest-environment jsdom
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import AdminPanelCard from '../AdminPanelCard/AdminPanelCard';
import { deleteEntity } from '../../services/adminService/adminService';
import React from 'react';
import AuthProvider from '../../utils/AuthProvider/AuthProvider';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../services/adminService/adminService');

describe('AdminPanelCard', () => {
    it('should display confirmation dialog on delete button click', () => {
        const { getByRole, getByText } = render(
            <AuthProvider>
                <MemoryRouter>
                    <AdminPanelCard
                        name='Test'
                        id='1'
                        description='Test description'
                        type='testType'
                        onDelete={() => {}}
                        link='/not-implemented'
                    />
                </MemoryRouter>
            </AuthProvider>,
        );

        fireEvent.click(getByRole('button'));

        expect(getByText('Confirm Deletion')).toBeInTheDocument();
    });

    it('should call deleteEntity on confirmation', async () => {
        deleteEntity.mockResolvedValue({ status: 200 });
        const onDelete = jest.fn();
        const { getByRole, getByText } = render(
            <AuthProvider>
                <MemoryRouter>
                    <AdminPanelCard
                        name='Test'
                        id='1'
                        description='Test description'
                        type='testType'
                        onDelete={onDelete}
                        link='/not-implemented'
                    />
                </MemoryRouter>
            </AuthProvider>,
        );

        fireEvent.click(getByRole('button'));
        fireEvent.click(getByText('Confirm'));

        await waitFor(() => expect(deleteEntity).toHaveBeenCalledWith('testType', '1'));
        expect(onDelete).toHaveBeenCalled();
    });

    it('should display error alert on deleteEntity failure', async () => {
        deleteEntity.mockRejectedValue(new Error('Failed to delete'));
        const { getByRole, getByText, findByText, findByTestId } = render(
            <AuthProvider>
                <MemoryRouter>
                    <AdminPanelCard
                        name='Test'
                        id='1'
                        description='Test description'
                        type='testType'
                        onDelete={() => {}}
                        link='/not-implemented'
                    />
                </MemoryRouter>
            </AuthProvider>,
        );

        fireEvent.click(getByRole('button'));
        fireEvent.click(getByText('Confirm'));

        const errorMessage = await findByText('Failed to delete');
        expect(errorMessage).toBeInTheDocument();
    });
});
