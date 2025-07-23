import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface PublicRouteProps {
  children: React.ReactNode;
  restricted?: boolean; // If true, prevent access when authenticated
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children, restricted = false }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // If the route is restricted (like signin/signup) and user is authenticated,
  // redirect to dashboard or the intended destination
  if (restricted && isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute; 