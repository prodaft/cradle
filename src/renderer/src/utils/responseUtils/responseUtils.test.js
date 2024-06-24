import { expect } from '@jest/globals';
import { displayError } from './responseUtils';

describe('displayError', () => {
    let setAlert;

    beforeEach(() => {
        setAlert = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should display the error message from the server if available', () => {
        const err = {
            response: {
                status: 500,
                data: {
                    detail: 'Internal Server Error',
                },
            },
        };

        const setError = displayError(setAlert);
        setError(err);

        expect(setAlert).toHaveBeenCalledWith({
            show: true,
            message: '500: Internal Server Error',
            color: 'red',
        });
    });

    it('should call the navigate function for 401 errors', () => {
        const err = {
            response: {
                status: 401,
                data: {
                    detail: 'Unauthorized',
                },
            },
        };

        const navigate = jest.fn();
        const setError = displayError(setAlert, navigate);
        setError(err);

        expect(setAlert).toHaveBeenCalledWith({
            show: true,
            message: 'Your session has expired. Please log back in.',
            color: 'red',
        });
        expect(navigate).toHaveBeenCalledWith('/login');
    });

    it('should display the error message from the error object if no server or client error message is available', () => {
        const err = new Error('Network Error');

        const setError = displayError(setAlert);
        setError(err);

        expect(setAlert).toHaveBeenCalledWith({
            show: true,
            message: 'Network Error',
            color: 'red',
        });
    });
});
