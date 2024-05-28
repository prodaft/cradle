/**
 * @jest-environment jsdom
 */
import { render, fireEvent, waitFor } from '@testing-library/react';
import AdminPanelAdd from '../AdminPanelAdd/AdminPanelAdd';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { createActor, createCase } from '../../services/adminService/adminService';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';


jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: true };
    }),
}));

jest.mock('../../services/adminService/adminService');

describe('AdminPanelAdd', () => {
    it('should call createActor when adding an actor', async () => {
        createActor.mockResolvedValue({ status: 200 });
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <AdminPanelAdd type="Actor" />
            </MemoryRouter>
        );
        fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'Test Actor' } });
        fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Test Description' } });
        fireEvent.click(getByText('Add'));
        await waitFor(() => expect(createActor).toHaveBeenCalledWith({ name: 'Test Actor', description: 'Test Description' }, 'testToken'));
    });

    it('should call createCase when adding a case', async () => {
        createCase.mockResolvedValue({ status: 200 });
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <AdminPanelAdd type="Case" />
            </MemoryRouter>
        );
        fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'Test Case' } });
        fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Test Description' } });
        fireEvent.click(getByText('Add'));
        await waitFor(() => expect(createCase).toHaveBeenCalledWith({ name: 'Test Case', description: 'Test Description' }, 'testToken'));
    });

    it('should display error message when createActor fails', async () => {
        createActor.mockRejectedValue(new Error('Failed to create actor'));
        const { getByPlaceholderText, getByText, getByTestId } = render(
            <MemoryRouter>
                <AdminPanelAdd type="Actor" />
            </MemoryRouter>
        );
        fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'Test Actor' } });
        fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Test Description' } });
        fireEvent.click(getByText('Add'));
        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });

    it('should display error message when createCase fails', async () => {
        createCase.mockRejectedValue(new Error('Failed to create case'));
        const { getByPlaceholderText, getByText, getByTestId } = render(
            <MemoryRouter>
                <AdminPanelAdd type="Case" />
            </MemoryRouter>
        );
        fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'Test Case' } });
        fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Test Description' } });
        fireEvent.click(getByText('Add'));
        await waitFor(() => {
            expect(getByTestId('auth-err-alert')).toBeInTheDocument();
        });
    });
});