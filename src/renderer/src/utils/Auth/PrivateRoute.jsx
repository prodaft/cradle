import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import {useAuth} from "../../hooks/useAuth";

const PrivateRoute = ({fallback}) => {
  const user = useAuth();
  if(!user.isAuthenticated()) {
    console.log("User tried accessing private route without being allowed");
    return <Navigate to={fallback} replace = {true}/>;
  }
  return <Outlet />; 
};

export default PrivateRoute;