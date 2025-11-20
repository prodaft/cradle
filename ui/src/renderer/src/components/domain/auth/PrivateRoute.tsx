import { Navigate, Outlet, useLocation } from 'react-router-dom';

import useAuth from '@/hooks/auth/useAuth';

interface PrivateRouteProps {
    fallback: string;
}

/**
 * PrivateRoute component - route that requires authentication to access
 * If the user is not authenticated, they are redirected to the fallback route
 */
export default function PrivateRoute({ fallback }: PrivateRouteProps) {
    const auth = useAuth();
    const location = useLocation();
    if (!auth.isLoggedIn()) {
        return <Navigate to={fallback} state={{ from: location }} replace={true} />;
    }
    return <Outlet />;
}
