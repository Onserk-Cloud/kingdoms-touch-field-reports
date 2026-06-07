import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import type { ReactNode } from 'react';
import type { Role } from '../lib/types';

interface Props {
  children: ReactNode;
  /** If set, the employee's role must be one of these to access the route. */
  roles?: Role[];
}

export function RequireAuth({ children, roles }: Props) {
  const employee = useSessionStore((s) => s.employee);
  const location = useLocation();

  if (!employee) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(employee.role)) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}
