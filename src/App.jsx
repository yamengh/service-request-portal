import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequestsProvider } from './context/RequestsContext';
import Navigation from './components/shared/Navigation';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import MyRequests from './pages/MyRequests';
import RequestDetails from './pages/RequestDetails';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <RequestsProvider>
        <div className="app">
          <Navigation />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/new-request" element={<NewRequest />} />
              <Route path="/requests" element={<MyRequests />} />
              <Route path="/requests/:id" element={<RequestDetails />} />
            </Routes>
          </main>
        </div>
      </RequestsProvider>
    </BrowserRouter>
  );
}

export default App;
