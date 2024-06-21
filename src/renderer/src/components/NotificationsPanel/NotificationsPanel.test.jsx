import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsPanel from './NotificationsPanel';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { getNotifications } from '../../services/notificationsService/notificationsService';

jest.mock('../../hooks/useAuth/useAuth');
jest.mock('../../services/notificationsService/notificationsService', () => ({
    getNotifications: jest.fn(),
}));

describe('NotificationsPanel', () => {
    const mockUseAuth = useAuth;

    beforeEach(() => {
        mockUseAuth.mockReturnValue({ access: 'mock-access-token' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders notifications when successfully fetched', async () => {
        const mockNotifications = [
            { id: '1', message: 'Notification 1', is_marked_unread: true },
            { id: '2', message: 'Notification 2', is_marked_unread: false },
        ];

        getNotifications.mockResolvedValue({ data: mockNotifications });

        const { getByTestId, getByText } = render(
            <NotificationsPanel
                handleCloseNotifications={() => {}}
                unreadNotificationsCount={2}
                setUnreadNotificationsCount={() => {}}
            />,
        );

        await waitFor(() => {
            expect(getByText('Notification 1')).toBeInTheDocument();
            expect(getByText('Notification 2')).toBeInTheDocument();
        });

        expect(getNotifications).toHaveBeenCalledWith('mock-access-token');
    });

    test('renders "No notifications to display" when there are no notifications', async () => {
        const mockNotifications = [];

        getNotifications.mockResolvedValueOnce({ data: mockNotifications });

        const { getByText } = render(
            <NotificationsPanel
                handleCloseNotifications={() => {}}
                unreadNotificationsCount={0}
                setUnreadNotificationsCount={() => {}}
            />,
        );

        await waitFor(() => {
            expect(getByText('No notifications to display')).toBeInTheDocument();
        });

        expect(getNotifications).toHaveBeenCalledTimes(1);
        expect(getNotifications).toHaveBeenCalledWith('mock-access-token');
    });

    test('handles close notifications panel button click', () => {
        const mockNotifications = [];

        const mockHandleNotificationsButton = jest.fn();

        getNotifications.mockResolvedValue({ data: mockNotifications });

        const { getByTestId } = render(
            <NotificationsPanel
                handleCloseNotifications={mockHandleNotificationsButton}
                unreadNotificationsCount={0}
                setUnreadNotificationsCount={() => {}}
            />,
        );

        fireEvent.click(getByTestId('close-notifications-panel'));

        expect(mockHandleNotificationsButton).toHaveBeenCalledTimes(1);
    });
});
