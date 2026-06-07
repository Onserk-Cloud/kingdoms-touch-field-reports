import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  supervisorOnly?: boolean;
}

export function RequireAuth({ children, supervisorOnly = false }: Props) {
  const employee = useSessionStore((s) => s.employee);
  const location = useLocation();

  if (!employee) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (supervisorOnly && employee.role !== 'supervisor') {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}
