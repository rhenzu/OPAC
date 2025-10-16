import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserPermissions } from '../../contexts/AuthContext';

interface ProtectedProps {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
  adminOnly?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders its children based on user permissions.
 * Use this for UI elements that should only be visible to users with specific permissions.
 */
const Protected: React.FC<ProtectedProps> = ({
  children,
  requiredPermission,
  adminOnly = false,
  fallback = null,
}) => {
  const { hasPermission, isAdmin } = useAuth();

  // Check if admin-only requirement is met
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  // Check for required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  // If all checks pass, render the children
  return <>{children}</>;
};

export default React.memo(Protected); 