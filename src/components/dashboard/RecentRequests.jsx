import { Link } from 'react-router-dom';
import Badge from '../shared/Badge';
import { formatDate } from '../../utils/formatters';
import './RecentRequests.css';

const RecentRequests = ({ requests }) => {
  const recentRequests = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="recent-requests">
      <h3 className="recent-requests-title">Recent Requests</h3>
      <div className="recent-requests-list">
        {recentRequests.map((request) => (
          <Link 
            key={request.id} 
            to={`/requests/${request.id}`}
            className="recent-request-item"
          >
            <div className="recent-request-header">
              <span className="recent-request-id">{request.id}</span>
              <Badge type="status" value={request.status} />
            </div>
            <h4 className="recent-request-title">{request.title}</h4>
            <span className="recent-request-date">{formatDate(request.createdAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentRequests;
