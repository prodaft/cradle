import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
    getNotificationCount,
    getNotifications,
    markUnread,
} from './notificationsService';

describe('notificationsService', () => {
    let mock;
    const token = 'test-token';

    beforeAll(() => {
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    afterAll(() => {
        mock.restore();
    });

    describe('getNotificationCount', () => {
        test('successfully makes a GET request to /notifications/unread-count/', async () => {
            const responseData = { unread_count: 5 };
            mock.onGet('/notifications/unread-count/').reply(200, responseData);

            const response = await getNotificationCount(token);

            expect(response.status).toBe(200);
            expect(response.data).toEqual(responseData);
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        });

        test('returns an error response from /notifications/unread-count/', async () => {
            mock.onGet('/notifications/unread-count/').reply(500);

            await expect(getNotificationCount(token)).rejects.toThrow();
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        });
    });

    describe('getNotifications', () => {
        test('successfully makes a GET request to /notifications/', async () => {
            const responseData = [{ id: 1, message: 'Test notification' }];
            mock.onGet('/notifications/').reply(200, responseData);

            const response = await getNotifications(token);

            expect(response.status).toBe(200);
            expect(response.data).toEqual(responseData);
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        });

        test('returns an error response from /notifications/', async () => {
            mock.onGet('/notifications/').reply(500);

            await expect(getNotifications(token)).rejects.toThrow();
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        });
    });

    describe('markUnread', () => {
        test('successfully makes a PUT request to /notifications/:notificationId/', async () => {
            const notificationId = 1;
            const flag = true;
            mock.onPut(`/notifications/${notificationId}/`).reply(200);

            const response = await markUnread(token, notificationId, flag);

            expect(response.status).toBe(200);
            expect(mock.history.put.length).toBe(1);
            expect(mock.history.put[0].headers.Authorization).toBe(`Bearer ${token}`);
            expect(mock.history.put[0].data).toBe(
                JSON.stringify({ is_marked_unread: flag }),
            );
        });

        test('returns an error response from /notifications/:notificationId/', async () => {
            const notificationId = 1;
            const flag = true;
            mock.onPut(`/notifications/${notificationId}/`).reply(500);

            await expect(markUnread(token, notificationId, flag)).rejects.toThrow();
            expect(mock.history.put.length).toBe(1);
            expect(mock.history.put[0].headers.Authorization).toBe(`Bearer ${token}`);
            expect(mock.history.put[0].data).toBe(
                JSON.stringify({ is_marked_unread: flag }),
            );
        });
    });
});
