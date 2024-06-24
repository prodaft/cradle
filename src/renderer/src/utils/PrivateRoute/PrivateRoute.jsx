import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth/useAuth';

/**
 * PrivateRoute component - route that requires authentication to access
 * If the user is not authenticated, they are redirected to the fallback route
 * @param fallback - the route to redirect to if the user is not authenticated
 * @returns {Element}
 * @constructor
 */
const PrivateRoute = ({ fallback }) => {
    const user = useAuth();
    const location = useLocation();
    if (!user.isAuthenticated()) {
        return (
            <Navigate
                to={fallback}
                state={{ from: location, state: location.state }}
                replace={true}
            />
        );
    }
    return <Outlet />;
};

export default PrivateRoute;
