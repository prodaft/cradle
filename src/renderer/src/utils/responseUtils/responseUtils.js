/**
 * This function can be used to display error message in an alert box,
 * by controlling the alert message and color states.
 *
 * If the error is from the server, display the error message from the server.
 * Otherwise, display the error message from the client.
 *
 * @param {(string) => void} setAlert - Function to set the alert message (state)
 * @param {(string) => void} setAlertColor - Function to set the alert color (state)
 * @returns {(err: any) => void} - Function to display error message in an alert box
 */
const displayError = (setAlert, setAlertColor) => {
    return (err) => {
        setAlertColor('red');
        if (err.response && err.response.data && err.response.data.detail) {
            setAlert(`${err.response.status}: ${err.response.data.detail}`);
        } else if (err.message) {
            setAlert(err.message);
        } else {
            setAlert('An unknown error occurred.');
        }
    };
};

export { displayError };
