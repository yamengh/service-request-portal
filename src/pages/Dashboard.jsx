import { Link } from 'react-router-dom';
import StatsCard from '../components/dashboard/StatsCard';
import RecentRequests from '../components/dashboard/RecentRequests';
import { useRequests } from '../context/RequestsContext';
import './Dashboard.css';

const Dashboard = () => {
  const { requests } = useRequests();

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;
  const inProgressRequests = requests.filter(r => r.status === 'In Progress').length;
  const completedRequests = requests.filter(r => r.status === 'Completed').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/new-request">
          <button className="btn-primary-action">Create New Request</button>
        </Link>
      </div>

      <div className="stats-grid">
        <StatsCard label="Total Requests" value={totalRequests} color="blue" />
        <StatsCard label="Pending" value={pendingRequests} color="yellow" />
        <StatsCard label="In Progress" value={inProgressRequests} color="blue" />
        <StatsCard label="Completed" value={completedRequests} color="green" />
      </div>

      <RecentRequests requests={requests} />

      <div className="dashboard-footer">
        <Link to="/requests" className="view-all-link">
          View All Requests →
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
