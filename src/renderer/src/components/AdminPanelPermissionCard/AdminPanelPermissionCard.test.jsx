/**
 * @jest-environment jsdom
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import AdminPanelPermissionCard from './AdminPanelPermissionCard';
import { changeAccess } from '../../services/adminService/adminService';
import React from 'react';
import '@testing-library/jest-dom';

jest.mock('../../services/adminService/adminService');

describe('AdminPanelPermissionCard', () => {
    it('should display current access level', () => {
        const { getByTestId, getByText } = render(
            <AdminPanelPermissionCard
                userId='1'
                caseName='Test Case'
                caseId='1'
                accessLevel='read'
            />,
        );
        expect(getByTestId('accessLevelDisplay')).toBeInTheDocument();
    });

    it('should call changeAccess when access level is changed', async () => {
        changeAccess.mockResolvedValue({ status: 200 });
        const { getByTestId, getByText } = render(
            <AdminPanelPermissionCard
                userId='1'
                caseName='Test Case'
                caseId='1'
                accessLevel='read'
            />,
        );
        fireEvent.click(getByTestId('accessLevelDisplay'));
        fireEvent.click(getByText('none'));
        await waitFor(() =>
            expect(changeAccess).toHaveBeenCalledWith('1', '1', 'none'),
        );
    });

    it('should display error message when changeAccess fails', async () => {
        changeAccess.mockRejectedValue(new Error('Failed to change access level'));
        const { getByTestId, getByText, findByText } = render(
            <AdminPanelPermissionCard
                userId='1'
                caseName='Test Case'
                caseId='1'
                accessLevel='read'
            />,
        );
        fireEvent.click(getByTestId('accessLevelDisplay'));
        fireEvent.click(getByText('none'));
        const errorMessage = await findByText('Failed to change access level');
        expect(errorMessage).toBeInTheDocument();
    });
});
