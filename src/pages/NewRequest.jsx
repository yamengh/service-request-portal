import RequestForm from '../components/form/RequestForm';
import Card from '../components/shared/Card';
import './NewRequest.css';

const NewRequest = () => {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">New Service Request</h1>
      </div>

      <Card>
        <RequestForm />
      </Card>
    </div>
  );
};

export default NewRequest;
