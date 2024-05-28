import { displayError } from './responseUtils';

describe('displayError', () => {
    let setAlert;
    let setAlertColor;

    beforeEach(() => {
        setAlert = jest.fn();
        setAlertColor = jest.fn();
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

        const setError = displayError(setAlert, setAlertColor);
        setError(err);

        expect(setAlertColor).toHaveBeenCalledWith('red');
        expect(setAlert).toHaveBeenCalledWith('500: Internal Server Error');
    });


    it('should display the error message from the error object if no server or client error message is available', () => {
        const err = new Error('Network Error');

        const setError = displayError(setAlert, setAlertColor);
        setError(err);

        expect(setAlertColor).toHaveBeenCalledWith('red');
        expect(setAlert).toHaveBeenCalledWith('Network Error');
    });
});