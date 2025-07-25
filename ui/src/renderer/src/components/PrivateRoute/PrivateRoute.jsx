import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import useAuth from '../../hooks/useAuth/useAuth';

/**
 * PrivateRoute component - route that requires authentication to access
 * If the user is not authenticated, they are redirected to the fallback route
 *
 * @function PrivateRoute
 * @param {Object} props - the props object
 * @param {string} props.fallback - the route to redirect to if the user is not authenticated
 * @returns {?React.ReactElement}
 * @constructor
 */
export default function PrivateRoute({ fallback }) {
    const user = useAuth();
    const location = useLocation();
    if (!user.isAuthenticated()) {
        return <Navigate to={fallback} state={{ from: location }} replace={true} />;
    }
    return <Outlet />;
}
