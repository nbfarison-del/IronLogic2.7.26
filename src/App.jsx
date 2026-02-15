import { DataProvider } from './context/DataContext';

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
