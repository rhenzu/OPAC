import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPermissions } from '../../contexts/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  adminOnly = false,
}) => {
  const { currentUser, userLoading, hasPermission, isAdmin } = useAuth();
  const location = useLocation();

  // Memoize the loading view so it doesn't re-render unnecessarily
  const loadingView = useMemo(() => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Loading user data...
      </Typography>
    </Box>
  ), []);

  // Return loading view
  if (userLoading) {
    return loadingView;
  }

  // Handle authentication
  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if admin-only route
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Check for required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin" replace />;
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};

export default React.memo(ProtectedRoute); 