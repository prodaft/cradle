/**
 * @jest-environment jsdom
 */
import { render, fireEvent, waitFor } from '@testing-library/react';
import AdminPanelCard from '../AdminPanelCard/AdminPanelCard';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { deleteEntity } from '../../services/adminService/adminService';
import React from 'react';
import AuthProvider from "../../utils/Auth/AuthProvider";
import {MemoryRouter} from "react-router-dom";
import '@testing-library/jest-dom';


jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken' };
    }),
}));

jest.mock('../../services/adminService/adminService');

describe('AdminPanelCard', () => {

    it('should display confirmation dialog on delete button click', () => {
        const { getByRole, getByText } = render(
            <AuthProvider>
                <MemoryRouter>
                    <AdminPanelCard name="Test" id="1" description="Test description" type="testType" onDelete={() => {}} />
                </MemoryRouter>
            </AuthProvider>
        );
        fireEvent.click(getByRole('button'));
        expect(getByText("Confirm Deletion")).toBeInTheDocument();
    });

    it('should call deleteEntity on confirmation', async () => {
        deleteEntity.mockResolvedValue({ status: 200 });
        const onDelete = jest.fn();
        const { getByRole, getByText } = render( <AuthProvider>
            <MemoryRouter>
                <AdminPanelCard name="Test" id="1" description="Test description" type="testType" onDelete={onDelete} />
            </MemoryRouter>
        </AuthProvider>
        );
        fireEvent.click(getByRole('button'));
        fireEvent.click(getByText('Confirm'));
        await waitFor(() => expect(deleteEntity).toHaveBeenCalledWith('testToken', 'testType', '1'));
        expect(onDelete).toHaveBeenCalled();
    });

    it('should display error alert on deleteEntity failure', async () => {
        deleteEntity.mockRejectedValue(new Error('Failed to delete'));
        const { getByRole, getByText, findByText } = render( <AuthProvider>
            <MemoryRouter>
                <AdminPanelCard name="Test" id="1" description="Test description" type="testType" onDelete={() => {}} />
            </MemoryRouter>
        </AuthProvider>);
        fireEvent.click(getByRole('button'));
        fireEvent.click(getByText('Confirm'));
        const errorMessage = await findByText('Error deleting entity');
        expect(errorMessage).toBeInTheDocument();
    });
});