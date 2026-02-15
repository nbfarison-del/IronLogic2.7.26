import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

// Components
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkoutLog from './pages/WorkoutLog';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import CalendarView from './pages/CalendarView';
import Questionnaire from './pages/Questionnaire';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
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
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
