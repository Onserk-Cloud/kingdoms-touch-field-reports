import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAuth } from './routes/RequireAuth';
import { useSessionStore } from './store/session';

import { PinLogin } from './screens/PinLogin';
import { Splash } from './screens/Splash';
import { Home } from './screens/Home';
import { NewReport } from './screens/NewReport';
import { Camera } from './screens/Camera';
import { Review } from './screens/Review';
import { Success } from './screens/Success';
import { MyReports } from './screens/MyReports';
import { Supervisor } from './screens/Supervisor';
import { SupervisorDetail } from './screens/SupervisorDetail';
import { EditReport } from './screens/EditReport';
import { ManageTeam } from './screens/ManageTeam';
import { Profile } from './screens/Profile';

export function App() {
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/" element={<EntryPoint />} />
      <Route path="/login" element={<PinLogin />} />
      <Route path="/splash" element={<Splash />} />

      <Route
        path="/home"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/new-report"
        element={
          <RequireAuth>
            <NewReport />
          </RequireAuth>
        }
      />
      <Route
        path="/camera"
        element={
          <RequireAuth>
            <Camera />
          </RequireAuth>
        }
      />
      <Route
        path="/review"
        element={
          <RequireAuth>
            <Review />
          </RequireAuth>
        }
      />
      <Route
        path="/success/:id"
        element={
          <RequireAuth>
            <Success />
          </RequireAuth>
        }
      />
      <Route
        path="/my-reports"
        element={
          <RequireAuth>
            <MyReports />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />

      <Route
        path="/report/:id"
        element={
          <RequireAuth>
            <SupervisorDetail />
          </RequireAuth>
        }
      />

      <Route
        path="/report/:id/edit"
        element={
          <RequireAuth>
            <EditReport />
          </RequireAuth>
        }
      />

      <Route
        path="/manage"
        element={
          <RequireAuth roles={['admin', 'super_admin']}>
            <ManageTeam />
          </RequireAuth>
        }
      />

      <Route
        path="/supervisor"
        element={
          <RequireAuth roles={['supervisor', 'admin', 'super_admin']}>
            <Supervisor />
          </RequireAuth>
        }
      />
      <Route
        path="/supervisor/report/:id"
        element={
          <RequireAuth roles={['supervisor', 'admin', 'super_admin']}>
            <SupervisorDetail />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Decides where to send the user when they first land on /.
 * - First time: splash → PIN.
 * - Authenticated employee: home.
 * - Authenticated supervisor: supervisor dashboard.
 */
function EntryPoint() {
  const employee = useSessionStore((s) => s.employee);
  const navigate = useNavigate();

  useEffect(() => {
    const seenSplash = sessionStorage.getItem('kt:splash-seen') === '1';
    if (!seenSplash) {
      sessionStorage.setItem('kt:splash-seen', '1');
      const t = setTimeout(() => navigate('/login', { replace: true }), 1400);
      return () => clearTimeout(t);
    }
    if (employee) {
      navigate(employee.role === 'employee' ? '/home' : '/supervisor', {
        replace: true,
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, [employee, navigate]);

  return <Splash />;
}
