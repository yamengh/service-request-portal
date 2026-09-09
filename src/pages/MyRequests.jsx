import RequestTable from '../components/requests/RequestTable';
import { useRequests } from '../context/RequestsContext';
import './MyRequests.css';

const MyRequests = () => {
  const { requests } = useRequests();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Requests</h1>
      </div>

      <RequestTable requests={requests} />
    </div>
  );
};

export default MyRequests;
