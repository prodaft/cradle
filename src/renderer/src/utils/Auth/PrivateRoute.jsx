import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

const PrivateRoute = ({fallback}) => {
  const user = useAuth();
  if (!user.isAuthenticated()) return <Navigate to={fallback} />;
  return <Outlet />;
};

export default PrivateRoute;