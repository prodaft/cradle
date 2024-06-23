import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsPanel from './NotificationsPanel';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { getNotifications } from '../../services/notificationsService/notificationsService';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../hooks/useAuth/useAuth');
jest.mock('../../services/notificationsService/notificationsService', () => ({
    getNotifications: jest.fn(),
}));

describe('NotificationsPanel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders notifications when successfully fetched', async () => {
        const mockNotifications = [
            { id: '1', message: 'Notification 1', is_marked_unread: true },
            { id: '2', message: 'Notification 2', is_marked_unread: false },
        ];

        getNotifications.mockResolvedValue({ data: mockNotifications });

        const { getByText } = render(
            <MemoryRouter>
                <NotificationsPanel
                    handleCloseNotifications={() => { }}
                    unreadNotificationsCount={2}
                    setUnreadNotificationsCount={() => { }}
                />
            </MemoryRouter>

        );

        await waitFor(() => {
            expect(getByText('Notification 1')).toBeInTheDocument();
            expect(getByText('Notification 2')).toBeInTheDocument();
        });
    });

    test('renders "No notifications to display" when there are no notifications', async () => {
        const mockNotifications = [];

        getNotifications.mockResolvedValueOnce({ data: mockNotifications });

        const { getByText } = render(
            <MemoryRouter>
                <NotificationsPanel
                    handleCloseNotifications={() => { }}
                    unreadNotificationsCount={0}
                    setUnreadNotificationsCount={() => { }}
                />
            </MemoryRouter>

        );

        await waitFor(() => {
            expect(getByText('No notifications to display')).toBeInTheDocument();
        });

        expect(getNotifications).toHaveBeenCalledTimes(1);
    });

    test('handles close notifications panel button click', () => {
        const mockNotifications = [];

        const mockHandleNotificationsButton = jest.fn();

        getNotifications.mockResolvedValue({ data: mockNotifications });

        const { getByTestId } = render(
            <MemoryRouter>
                <NotificationsPanel
                    handleCloseNotifications={mockHandleNotificationsButton}
                    unreadNotificationsCount={0}
                    setUnreadNotificationsCount={() => { }}
                />
            </MemoryRouter>

        );

        fireEvent.click(getByTestId('close-notifications-panel'));

        expect(mockHandleNotificationsButton).toHaveBeenCalledTimes(1);
    });
});
