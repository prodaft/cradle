/**
 * @jest-environment jsdom
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import AdminPanelAdd from '../AdminPanelAdd/AdminPanelAdd';
import { createActor, createEntity } from '../../services/adminService/adminService';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { isAdmin: true };
    }),
}));

jest.mock('../../services/adminService/adminService');

describe('AdminPanelAdd', () => {
    it('should call createActor when adding an actor', async () => {
        createActor.mockResolvedValue({ status: 200 });
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <AdminPanelAdd type='Actor' />
            </MemoryRouter>,
        );
        fireEvent.change(getByPlaceholderText('Name'), {
            target: { value: 'Test Actor' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Test Description' },
        });
        fireEvent.click(getByText('Add'));
        await waitFor(() =>
            expect(createActor).toHaveBeenCalledWith({
                name: 'Test Actor',
                description: 'Test Description',
            }),
        );
    });

    it('should call createEntity when adding an entity', async () => {
        createEntity.mockResolvedValue({ status: 200 });
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <AdminPanelAdd type='Entity' />
            </MemoryRouter>,
        );
        fireEvent.change(getByPlaceholderText('Name'), {
            target: { value: 'Test Entity' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Test Description' },
        });
        fireEvent.click(getByText('Add'));
        await waitFor(() =>
            expect(createEntity).toHaveBeenCalledWith({
                name: 'Test Entity',
                description: 'Test Description',
            }),
        );
    });

    it('should display error message when createActor fails', async () => {
        createActor.mockRejectedValue(new Error('Failed to create actor'));
        const { getByPlaceholderText, getByText, getByTestId } = render(
            <MemoryRouter>
                <AdminPanelAdd type='Actor' />
            </MemoryRouter>,
        );
        fireEvent.change(getByPlaceholderText('Name'), {
            target: { value: 'Test Actor' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Test Description' },
        });
        fireEvent.click(getByText('Add'));
        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should display error message when createEntity fails', async () => {
        createEntity.mockRejectedValue(new Error('Failed to create entity'));
        const { getByPlaceholderText, getByText, getByTestId } = render(
            <MemoryRouter>
                <AdminPanelAdd type='Entity' />
            </MemoryRouter>,
        );
        fireEvent.change(getByPlaceholderText('Name'), {
            target: { value: 'Test Entity' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Test Description' },
        });
        fireEvent.click(getByText('Add'));
        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });
});
