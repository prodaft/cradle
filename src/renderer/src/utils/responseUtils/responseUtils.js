/**
 * This function can be used to display error message in an alert box,
 * by controlling the alert message and color states.
 *
 * If the error is from the server, display the error message from the server.
 * Otherwise, display the error message from the client.
 *
 * @param {(string) => void} setAlert - Function to set the alert message (state)
 * @returns {(err: any) => void} Function to display error message in an alert box
 */
const displayError = (setAlert) => {
    return (err) => {
        let message = 'An unknown error occurred.';

        if (err.response && err.response.data && err.response.data.detail) {
            message = `${err.response.status}: ${err.response.data.detail}`;
        } else if (err.message) {
            message = err.message;
        }

        setAlert({ show: true, message, color: 'red' });
    };
};

export { displayError };
