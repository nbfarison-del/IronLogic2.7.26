import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getUserProfile } from './services/firestoreService';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { TimerProvider } from './context/TimerContext';
import { ToastProvider } from './context/ToastContext';


// Components
import Layout from './components/Layout';
import TimerWidget from './components/TimerWidget';
import ErrorBoundary from './components/ErrorBoundary';
import { SUPER_ADMIN_EMAIL } from './config/constants';

// Pages - Lazy Loaded
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Home = lazy(() => import('./pages/Home'));

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const WorkoutLog = lazy(() => import('./pages/WorkoutLog'));
const Progress = lazy(() => import('./pages/Progress'));
const RTSImport = lazy(() => import('./pages/RTSImport'));
const Profile = lazy(() => import('./pages/Profile'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Admin = lazy(() => import('./pages/Admin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Programs = lazy(() => import('./pages/Programs'));
const ProPlanner = lazy(() => import('./pages/ProPlanner'));

const Questionnaire = lazy(() => import('./pages/Questionnaire'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const CompetitionPeaking = lazy(() => import('./pages/CompetitionPeaking'));


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <AppLoading label="Authenticating" />;
  if (!user) return <Navigate to="/" />;
  return children;
};


const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <AppLoading label="Checking permissions" />;
  if (!user) return <Navigate to="/login" />;
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Double-security for Admin specifically
  if (allowedRoles.includes('admin') && (user.role !== 'admin' || user.email !== SUPER_ADMIN_EMAIL)) {
    return <Navigate to="/" replace />;
  }


  return children;
};

const SubscriptionGuard = ({ children }) => {
  // IronLogic is free — no trial, no paywall. This guard is intentionally a
  // no-op so the route definitions that reference it keep working unchanged.
  return children;
};

const CoachAthleteAccessGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const { athleteId } = useParams();
  const [accessState, setAccessState] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      if (loading) return;
      if (!user || !athleteId) {
        if (isMounted) setAccessState('denied');
        return;
      }

      if (user.role === 'admin' && user.email === SUPER_ADMIN_EMAIL) {
        if (isMounted) setAccessState('allowed');
        return;
      }

      try {
        const athleteProfile = await getUserProfile(athleteId);
        const isAssignedCoach = athleteProfile?.coach_id === user.id || athleteProfile?.coachId === user.id;
        if (isMounted) setAccessState(isAssignedCoach ? 'allowed' : 'denied');
      } catch (error) {
        console.error('Coach-athlete access check failed:', error);
        if (isMounted) setAccessState('denied');
      }
    };

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [athleteId, loading, user]);

  if (loading || accessState === 'checking') return <AppLoading label="Checking athlete access" />;
  if (accessState !== 'allowed') return <Navigate to="/coach" replace />;
  return children;
};

const AppLoading = ({ label = 'Loading' }) => (
  <div className="app-state">
    <div className="app-state-panel">
      <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
      <p className="app-state-eyebrow">{label}</p>
      <p>Getting your workspace ready.</p>
    </div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

const NotFound = () => (
  <div className="app-state">
    <div className="app-state-panel">
      <p className="app-state-eyebrow">404</p>
      <h1>That screen does not exist</h1>
      <p>The link may be outdated, or the page may have moved.</p>
      <div className="app-state-actions">
        <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        <Link to="/calendar" className="btn">Open Calendar</Link>
      </div>
    </div>
  </div>
);

// ... inside App component ...
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));
const AdaptiveCoach = lazy(() => import('./pages/AdaptiveCoach'));
const WeeklyCheckIn = lazy(() => import('./pages/WeeklyCheckIn'));

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      {user && <TimerWidget />}
      <Routes>
        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public/Landing Routes */}
          <Route path="/" element={user ? <Home /> : <LandingPage />} />


          <Route path="/log" element={
            <ProtectedRoute>
              <WorkoutLog />
            </ProtectedRoute>
          } />
          <Route path="/progress" element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          } />
          <Route path="/import" element={
            <ProtectedRoute>
              <RTSImport />
            </ProtectedRoute>
          } />
          <Route path="/programs" element={
            <ProtectedRoute>
              <Programs />
            </ProtectedRoute>
          } />

          <Route path="/checkin" element={
            <ProtectedRoute>
              <SubscriptionGuard>
                <WeeklyCheckIn />
              </SubscriptionGuard>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <CalendarView />
            </ProtectedRoute>
          } />
          <Route path="/questionnaire" element={
            <ProtectedRoute>
              <Questionnaire />
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          } />
          <Route path="/peaking" element={
            <ProtectedRoute>
              <CompetitionPeaking />
            </ProtectedRoute>
          } />
          <Route path="/olympic-lifting" element={
            <ProtectedRoute>
              <WorkoutLog />
            </ProtectedRoute>
          } />

          {/* Role-Specific Routes */}
          <Route path="/coach" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachDashboard />
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/coach/plan/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachAthleteAccessGuard>
                  <ProPlanner />
                </CoachAthleteAccessGuard>
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/coach/adaptive/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachAthleteAccessGuard>
                  <AdaptiveCoach />
                </CoachAthleteAccessGuard>
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/coach/athlete/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachAthleteAccessGuard>
                  <WorkoutLog />
                </CoachAthleteAccessGuard>
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/calendar/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachAthleteAccessGuard>
                  <CalendarView />
                </CoachAthleteAccessGuard>
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/coach/checkin/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <CoachAthleteAccessGuard>
                  <WeeklyCheckIn />
                </CoachAthleteAccessGuard>
              </SubscriptionGuard>
            </RoleProtectedRoute>
          } />
          <Route path="/admin" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </RoleProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <SettingsProvider>
            <TimerProvider>
              <Suspense fallback={
                <AppLoading label="Loading IronLogic" />
              }>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </Suspense>

            </TimerProvider>
          </SettingsProvider>
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}


export default App;
