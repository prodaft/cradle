import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import {useAuth} from "../../hooks/useAuth/useAuth";

/**
 * PrivateRoute component - route that requires authentication to access
 * If the user is not authenticated, they are redirected to the fallback route
 * @param fallback - the route to redirect to if the user is not authenticated
 * @returns {Element}
 * @constructor
 */
const PrivateRoute = ({fallback}) => {
  const user = useAuth();
  if(!user.isAuthenticated()) {
    console.log("User tried accessing private route without being allowed");
    return <Navigate to={fallback} replace = {true}/>;
  }
  return <Outlet />; 
};

export default PrivateRoute;