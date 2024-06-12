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

        expect(setAlert).toHaveBeenCalledWith({ show: true, message: '500: Internal Server Error', color: 'red' });
    });

    it('should display the error message from the error object if no server or client error message is available', () => {
        const err = new Error('Network Error');

        const setError = displayError(setAlert);
        setError(err);

        expect(setAlert).toHaveBeenCalledWith({ show: true, message: 'Network Error', color: 'red' });
    });
});
