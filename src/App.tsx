import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAuth } from './routes/RequireAuth';
import { useSessionStore } from './store/session';

// Entry-path screens load eagerly (fast first paint); the rest are
// code-split so the login bundle stays small.
import { PinLogin } from './screens/PinLogin';
import { Splash } from './screens/Splash';

const Home = lazy(() =>
  import('./screens/Home').then((m) => ({ default: m.Home })),
);
const NewReport = lazy(() =>
  import('./screens/NewReport').then((m) => ({ default: m.NewReport })),
);
const Camera = lazy(() =>
  import('./screens/Camera').then((m) => ({ default: m.Camera })),
);
const Review = lazy(() =>
  import('./screens/Review').then((m) => ({ default: m.Review })),
);
const Success = lazy(() =>
  import('./screens/Success').then((m) => ({ default: m.Success })),
);
const MyReports = lazy(() =>
  import('./screens/MyReports').then((m) => ({ default: m.MyReports })),
);
const Supervisor = lazy(() =>
  import('./screens/Supervisor').then((m) => ({ default: m.Supervisor })),
);
const SupervisorDetail = lazy(() =>
  import('./screens/SupervisorDetail').then((m) => ({
    default: m.SupervisorDetail,
  })),
);
const EditReport = lazy(() =>
  import('./screens/EditReport').then((m) => ({ default: m.EditReport })),
);
const ManageTeam = lazy(() =>
  import('./screens/ManageTeam').then((m) => ({ default: m.ManageTeam })),
);
const Notifications = lazy(() =>
  import('./screens/Notifications').then((m) => ({ default: m.Notifications })),
);
const Profile = lazy(() =>
  import('./screens/Profile').then((m) => ({ default: m.Profile })),
);
const EditProfile = lazy(() =>
  import('./screens/EditProfile').then((m) => ({ default: m.EditProfile })),
);
const Help = lazy(() =>
  import('./screens/Help').then((m) => ({ default: m.Help })),
);
const ManageCases = lazy(() =>
  import('./screens/ManageCases').then((m) => ({ default: m.ManageCases })),
);
const CreateCase = lazy(() =>
  import('./screens/CreateCase').then((m) => ({ default: m.CreateCase })),
);
const CaseDetail = lazy(() =>
  import('./screens/CaseDetail').then((m) => ({ default: m.CaseDetail })),
);
const EditCase = lazy(() =>
  import('./screens/EditCase').then((m) => ({ default: m.EditCase })),
);

/** Brief neutral screen shown while a route chunk loads. */
function RouteFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F7F3E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '3px solid rgba(31,61,43,0.15)',
          borderTopColor: '#1F3D2B',
          animation: 'kt-spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

export function App() {
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Suspense fallback={<RouteFallback />}>
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
          path="/profile/edit"
          element={
            <RequireAuth>
              <EditProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <Notifications />
            </RequireAuth>
          }
        />
        <Route
          path="/help"
          element={
            <RequireAuth>
              <Help />
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

        {/* Cases — staff create/assign & manage; employees open their assigned ones */}
        <Route
          path="/cases"
          element={
            <RequireAuth roles={['supervisor', 'admin', 'super_admin']}>
              <ManageCases />
            </RequireAuth>
          }
        />
        <Route
          path="/cases/new"
          element={
            <RequireAuth roles={['supervisor', 'admin', 'super_admin']}>
              <CreateCase />
            </RequireAuth>
          }
        />
        <Route
          path="/cases/:id/edit"
          element={
            <RequireAuth roles={['supervisor', 'admin', 'super_admin']}>
              <EditCase />
            </RequireAuth>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <RequireAuth>
              <CaseDetail />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
