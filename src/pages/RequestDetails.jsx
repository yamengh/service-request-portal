import { useParams, Link } from 'react-router-dom';
import Badge from '../components/shared/Badge';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import { useRequests } from '../context/RequestsContext';
import { formatDateTime } from '../utils/formatters';
import './RequestDetails.css';

const RequestDetails = () => {
  const { id } = useParams();
  const { requests } = useRequests();
  const request = requests.find(r => r.id === id);

  if (!request) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Request Not Found</h1>
        </div>
        <Card>
          <p className="not-found-text">The request with ID "{id}" could not be found.</p>
          <Link to="/requests">
            <Button variant="primary">Back to My Requests</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/requests">
          <Button variant="secondary">← Back to My Requests</Button>
        </Link>
        <h1 className="page-title">Request Details</h1>
        <div></div>
      </div>

      <Card className="request-details-card">
        <div className="request-details-header">
          <div className="request-details-id">
            <span className="request-details-label">Request ID</span>
            <span className="request-details-value">{request.id}</span>
          </div>
          <div className="request-details-badges">
            <Badge type="status" value={request.status} />
            <Badge type="priority" value={request.priority} />
          </div>
        </div>

        <div className="request-details-section">
          <h2 className="request-details-section-title">Title</h2>
          <p className="request-details-text">{request.title}</p>
        </div>

        <div className="request-details-section">
          <h2 className="request-details-section-title">Description</h2>
          <p className="request-details-text">{request.description}</p>
        </div>

        <div className="request-details-grid">
          <div className="request-details-field">
            <span className="request-details-label">Category</span>
            <span className="request-details-value">{request.category}</span>
          </div>
          <div className="request-details-field">
            <span className="request-details-label">Priority</span>
            <span className="request-details-value">{request.priority}</span>
          </div>
          <div className="request-details-field">
            <span className="request-details-label">Status</span>
            <span className="request-details-value">{request.status}</span>
          </div>
          <div className="request-details-field">
            <span className="request-details-label">Created</span>
            <span className="request-details-value">{formatDateTime(request.createdAt)}</span>
          </div>
          <div className="request-details-field">
            <span className="request-details-label">Last Updated</span>
            <span className="request-details-value">{formatDateTime(request.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RequestDetails;
