import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { TimerProvider } from './context/TimerContext';

// Components
import Layout from './components/Layout';
import TimerWidget from './components/TimerWidget';

// Pages - Lazy Loaded
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const WorkoutLog = lazy(() => import('./pages/WorkoutLog'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Admin = lazy(() => import('./pages/Admin'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Authenticating...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Checking permissions...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Double-security for Admin specifically
  if (allowedRoles.includes('admin') && user.email !== 'nbfarison@gmail.com') {
    return <Navigate to="/" replace />;
  }

  return children;
};

const SubscriptionGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // For now, allow 'beta' and 'active'
  const isSubscriber = user?.subscriptionStatus === 'beta' || user?.subscriptionStatus === 'active';

  if (!isSubscriber) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h2>Subscription Required</h2>
        <p>Your trial has expired or you do not have an active subscription.</p>
        <Link to="/profile" className="btn btn-primary">Upgrade Now</Link>
      </div>
    );
  }

  return children;
};

// ... inside App component ...
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));
const AdaptiveCoach = lazy(() => import('./pages/AdaptiveCoach'));
const WeeklyCheckIn = lazy(() => import('./pages/WeeklyCheckIn'));

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <SettingsProvider>
          <TimerProvider>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff' }}>
              <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            <TimerWidget />
            <Routes>
              <Route element={<Layout />}>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
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

                {/* Role-Specific Routes */}
                <Route path="/coach" element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
                    <SubscriptionGuard>
                      <CoachDashboard />
                    </SubscriptionGuard>
                  </RoleProtectedRoute>
                } />
                <Route path="/coach/adaptive/:athleteId" element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
                    <SubscriptionGuard>
                      <AdaptiveCoach />
                    </SubscriptionGuard>
                  </RoleProtectedRoute>
                } />
                <Route path="/coach/athlete/:athleteId" element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
                    <SubscriptionGuard>
                      <WorkoutLog />
                    </SubscriptionGuard>
                  </RoleProtectedRoute>
                } />
                <Route path="/calendar/:athleteId" element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
                    <SubscriptionGuard>
                      <CalendarView />
                    </SubscriptionGuard>
                  </RoleProtectedRoute>
                } />
                <Route path="/coach/checkin/:athleteId" element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
                    <SubscriptionGuard>
                      <WeeklyCheckIn />
                    </SubscriptionGuard>
                  </RoleProtectedRoute>
                } />
                <Route path="/admin" element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </RoleProtectedRoute>
                } />
              </Route>
            </Routes>
          </Suspense>
          </TimerProvider>
        </SettingsProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
