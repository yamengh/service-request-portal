import { Link } from 'react-router-dom';
import Badge from '../shared/Badge';
import { formatDate } from '../../utils/formatters';
import './RequestRow.css';

const RequestRow = ({ request }) => {
  return (
    <Link to={`/requests/${request.id}`} className="request-row">
      <div className="request-cell request-cell-id">{request.id}</div>
      <div className="request-cell request-cell-title">{request.title}</div>
      <div className="request-cell request-cell-status">
        <Badge type="status" value={request.status} />
      </div>
      <div className="request-cell request-cell-priority">
        <Badge type="priority" value={request.priority} />
      </div>
      <div className="request-cell request-cell-date">{formatDate(request.createdAt)}</div>
    </Link>
  );
};

export default RequestRow;
