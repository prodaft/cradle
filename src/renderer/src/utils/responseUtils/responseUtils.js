/**
 * This function can be used to display error message in an alert box,
 * by controlling the alert message and color states.
 *
 * If the error is from the server, display the error message from the server.
 * Otherwise, display the error message from the client.
 *
 * If the error is a 401, the user is redirected to the login page.
 *
 * @function displayError
 * @param {StateSetter<Alert>} setAlert - Function to set the alert message (state)
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

        let message = null;

        if (err.response && err.response.status === 500) {
            message = 'Server error. Please try again later.';
        }

        if (!message && err.response && err.response.data) {
            if (err.response.data.detail) {
                message = `${err.response.status}: ${err.response.data.detail}`;
            }
            for (const key in err.response.data) {
                if (message) {
                    break;
                }
                if (key.includes('error')) {
                    console.log(`Guessing the error message is in key: ${key}`);
                    message = err.response.data[key];
                }
            }
            if (!message) {
                message = JSON.stringify(err.response.data);
            }
        }

        if (!message && err.message) {
            message = err.message;
        }
        if (!message) {
            message = 'An unknown error occurred.';
        }

        setAlert({ show: true, message, color: 'red' });
    };
};

export { displayError };
