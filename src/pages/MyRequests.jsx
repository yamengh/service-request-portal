import RequestTable from '../components/requests/RequestTable';
import { useRequests } from '../context/RequestsContext';
import { useAuth } from '../context/AuthContext';
import './MyRequests.css';

const MyRequests = () => {
  const { requests, loading, error } = useRequests();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">{user?.role === 'admin' ? 'All Requests' : 'My Requests'}</h1>
        </div>
        <div className="loading-state">Loading requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">{user?.role === 'admin' ? 'All Requests' : 'My Requests'}</h1>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{user?.role === 'admin' ? 'All Requests' : 'My Requests'}</h1>
      </div>

      <RequestTable requests={requests} isAdmin={user?.role === 'admin'} />
    </div>
  );
};

export default MyRequests;
