/**
 * @jest-environment jsdom
 */
import {render, fireEvent, waitFor, getAllByText} from '@testing-library/react';
import AdminPanelPermissionCard from './AdminPanelPermissionCard';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { changeAccess } from '../../services/adminService/adminService';
import React from 'react';
import '@testing-library/jest-dom';


jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken' };
    }),
}));

jest.mock('../../services/adminService/adminService');

describe('AdminPanelUserPermissions', () => {
    it('should display current access level', () => {
        const { getByTestId,getByText } = render(<AdminPanelPermissionCard userId="1" caseName="Test Case" caseId="1" accessLevel="read" />);
        expect(getByTestId('accessLevelDisplay')).toBeInTheDocument();
    });

    it('should call changeAccess when access level is changed', async () => {
        changeAccess.mockResolvedValue({ status: 200 });
        const { getByTestId, getByText } = render(<AdminPanelPermissionCard userId="1" caseName="Test Case" caseId="1" accessLevel="read" />);
        fireEvent.click(getByTestId('accessLevelDisplay'));
        fireEvent.click(getByText('none'));
        await waitFor(() => expect(changeAccess).toHaveBeenCalledWith('testToken', '1', '1', 'none'));
    });

    it('should display error message when changeAccess fails', async () => {
        changeAccess.mockRejectedValue(new Error('Failed to change access level'));
        const { getByTestId,getByText, findByText } = render(<AdminPanelPermissionCard userId="1" caseName="Test Case" caseId="1" accessLevel="read" />);
        fireEvent.click(getByTestId('accessLevelDisplay'));
        fireEvent.click(getByText('none'));
        const errorMessage = await findByText('Error changing access level');
        expect(errorMessage).toBeInTheDocument();
    });
});