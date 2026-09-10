import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequestsProvider } from './context/RequestsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import Navigation from './components/shared/Navigation';
import Dashboard from './pages/Dashboard';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import RequestDetails from './pages/RequestDetails';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequestsProvider>
                <NotificationsProvider>
                  <ProtectedRoute>
                    <div className="app">
                      <Navigation />
                      <main className="main-content">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/requests" element={<MyRequests />} />
                          <Route path="/new-request" element={<NewRequest />} />
                          <Route path="/requests/:id" element={<RequestDetails />} />
                          <Route path="/notifications" element={<Notifications />} />
                        </Routes>
                      </main>
                    </div>
                  </ProtectedRoute>
                </NotificationsProvider>
              </RequestsProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
