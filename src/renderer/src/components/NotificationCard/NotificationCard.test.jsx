import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationCard from './NotificationCard';
import { markUnread } from '../../services/notificationsService/notificationsService';
import { changeAccess } from '../../services/adminService/adminService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';

jest.mock('../../services/notificationsService/notificationsService');
jest.mock('../../services/adminService/adminService');
jest.mock('../../hooks/useAuth/useAuth');
jest.mock('../../utils/responseUtils/responseUtils');

describe('NotificationCard', () => {
    const mockNotification = {
        id: '1',
        message: 'Test notification message',
        timestamp: '2023-06-01T12:00:00Z',
        is_marked_unread: true,
        notification_type: 'request_access_notification',
        case_id: '123',
        requesting_user_id: '456',
    };

    const mockSimpleNotification = {
        id: '1',
        message: 'Test notification message',
        timestamp: '2023-06-01T12:00:00Z',
        is_marked_unread: false,
        notification_type: 'message_notification',
    };

    const mockSetAlert = jest.fn();
    const mockUpdateFlaggedNotificationsCount = jest.fn();

    beforeEach(() => {
        useAuth.mockReturnValue({ access: 'test-token' });
        displayError.mockImplementation(() => jest.fn());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders a simple notification card', () => {
        render(
            <NotificationCard
                notification={mockSimpleNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        expect(screen.getByText('Test notification message')).toBeInTheDocument();
        expect(
            screen.getByText(new Date('2023-06-01T12:00:00Z').toLocaleString()),
        ).toBeInTheDocument();
    });

    test('renders an access notification card', () => {
        render(
            <NotificationCard
                notification={mockNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        expect(screen.getByText('Test notification message')).toBeInTheDocument();
        expect(
            screen.getByText(new Date('2023-06-01T12:00:00Z').toLocaleString()),
        ).toBeInTheDocument();
        expect(screen.getByText('Read')).toBeInTheDocument();
        expect(screen.getByText('Read/Write')).toBeInTheDocument();
    });

    test('calls markUnread successfully and updates state', async () => {
        markUnread.mockResolvedValue({ status: 200 });

        render(
            <NotificationCard
                notification={mockNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        const markUnreadButton = screen.getByTestId('mark-read');
        fireEvent.click(markUnreadButton);

        await waitFor(() => {
            expect(markUnread).toHaveBeenCalledWith('test-token', '1', false);
            expect(mockUpdateFlaggedNotificationsCount).toHaveBeenCalledWith(
                expect.any(Function),
            );
            expect(screen.getByTestId('mark-unread')).toBeInTheDocument();
        });
    });

    test('handles markUnread error', async () => {
        markUnread.mockRejectedValue(new Error('Failed to mark unread'));

        render(
            <NotificationCard
                notification={mockNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        const markUnreadButton = screen.getByTestId('mark-read');
        fireEvent.click(markUnreadButton);

        await waitFor(() => {
            expect(displayError).toHaveBeenCalledWith(mockSetAlert);
        });
    });

    test('calls changeAccess successfully and shows alert', async () => {
        changeAccess.mockResolvedValue({ status: 200 });

        render(
            <NotificationCard
                notification={mockNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        const readAccessButton = screen.getByText('Read');
        fireEvent.click(readAccessButton);

        await waitFor(() => {
            expect(changeAccess).toHaveBeenCalledWith(
                'test-token',
                '456',
                '123',
                'read',
            );
            expect(mockSetAlert).toHaveBeenCalledWith({
                show: true,
                message: 'Access level changed successfully',
                color: 'green',
            });
        });
    });

    test('handles changeAccess error', async () => {
        changeAccess.mockRejectedValue(new Error('Failed to change access'));

        render(
            <NotificationCard
                notification={mockNotification}
                setAlert={mockSetAlert}
                updateFlaggedNotificationsCount={mockUpdateFlaggedNotificationsCount}
            />,
        );

        const readAccessButton = screen.getByText('Read');
        fireEvent.click(readAccessButton);

        await waitFor(() => {
            expect(displayError).toHaveBeenCalledWith(mockSetAlert);
        });
    });
});
