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
import { SUPER_ADMIN_EMAIL } from './config/constants';

// Pages - Lazy Loaded
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Home = lazy(() => import('./pages/Home'));

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Paths = lazy(() => import('./pages/Paths'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const Templates = lazy(() => import('./pages/Templates'));
const Admin = lazy(() => import('./pages/Admin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const Questionnaire = lazy(() => import('./pages/Questionnaire'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));


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
        <Link to="/" className="btn btn-primary">Go Home</Link>
        <Link to="/paths" className="btn">Browse Paths</Link>
      </div>
    </div>
  </div>
);

// ... inside App component ...

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


          <Route path="/paths" element={
            <ProtectedRoute>
              <Paths />
            </ProtectedRoute>
          } />
          <Route path="/progress" element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          } />
          <Route path="/templates" element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
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
