import RequestRow from './RequestRow';
import './RequestTable.css';

const RequestTable = ({ requests }) => {
  if (requests.length === 0) {
    return (
      <div className="request-table-empty">
        <p className="request-table-empty-text">No requests found</p>
      </div>
    );
  }

  return (
    <div className="request-table">
      <div className="request-table-header">
        <div className="request-header-cell request-header-cell-id">ID</div>
        <div className="request-header-cell request-header-cell-title">Title</div>
        <div className="request-header-cell request-header-cell-status">Status</div>
        <div className="request-header-cell request-header-cell-priority">Priority</div>
        <div className="request-header-cell request-header-cell-date">Date</div>
      </div>
      <div className="request-table-body">
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
};

export default RequestTable;
