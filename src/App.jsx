import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { TimerProvider } from './context/TimerContext';
import { ToastProvider } from './context/ToastContext';


// Components
import Layout from './components/Layout';
import TimerWidget from './components/TimerWidget';
import ErrorBoundary from './components/ErrorBoundary';

// Pages - Lazy Loaded
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Home = lazy(() => import('./pages/Home'));

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const WorkoutLog = lazy(() => import('./pages/WorkoutLog'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Admin = lazy(() => import('./pages/Admin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Programs = lazy(() => import('./pages/Programs'));
const ProPlanner = lazy(() => import('./pages/ProPlanner'));
const PartnerWorkout = lazy(() => import('./pages/PartnerWorkout'));


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Authenticating...</div>;
  if (!user) return <Navigate to="/" />;
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
  if (allowedRoles.includes('admin') && (user.role !== 'admin' || user.email !== 'nbfarison@gmail.com')) {
    return <Navigate to="/" replace />;
  }


  return children;
};

const SubscriptionGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // New athletes get a 14-day trial
  const now = Date.now();
  const trialStillActive = user?.trialExpiresAt ? (user.trialExpiresAt.toMillis ? user.trialExpiresAt.toMillis() : user.trialExpiresAt) > now : false;
  
  const isSubscriber = user?.subscriptionStatus === 'beta' || 
                       user?.subscriptionStatus === 'active' || 
                       user?.role === 'admin' || 
                       trialStillActive;

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
          <Route path="/programs" element={
            <ProtectedRoute>
              <Programs />
            </ProtectedRoute>
          } />
          <Route path="/partner" element={
            <ProtectedRoute>
              <PartnerWorkout />
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
          <Route path="/coach/plan/:athleteId" element={
            <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
              <SubscriptionGuard>
                <ProPlanner />
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
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <SettingsProvider>
          <TimerProvider>
            <ToastProvider>
              <Suspense fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff' }}>
                  <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              }>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </Suspense>

            </ToastProvider>
          </TimerProvider>
        </SettingsProvider>
      </DataProvider>
    </AuthProvider>
  );
}


export default App;
