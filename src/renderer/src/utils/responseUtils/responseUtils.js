/**
 * This function can be used to display error message in an alert box,
 * by controlling the alert message and color states.
 *
 * If the error is from the server, display the error message from the server.
 * Otherwise, display the error message from the client.
 * 
 * If the error is a 401, the user is redirected to the login page.
 *
 * @param {Function} setAlert - Function to set the alert message (state)
 * @param {Function} [navigate] - Function to navigate to a different page
 * @returns {Function} - Function to display the error message
 */
const displayError = (setAlert, navigate) => {
    return (err) => {
        if (err.response && err.response.status === 401 && navigate) {
            setAlert({
                show: true,
                message: 'Your session has expired. Please log back in.',
                color: 'red',
            });
            navigate('/login');
            return;
        }

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
