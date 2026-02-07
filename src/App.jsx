import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkoutLog from './pages/WorkoutLog';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import CalendarView from './pages/CalendarView';
import Questionnaire from './pages/Questionnaire';

// Simple protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
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
          </Route>
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
