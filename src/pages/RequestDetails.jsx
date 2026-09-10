import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Badge from '../components/shared/Badge';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import { useRequests } from '../context/RequestsContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import * as requestService from '../services/requestService';
import './RequestDetails.css';

const RequestDetails = () => {
  const { id } = useParams();
  const { updateStatus } = useRequests();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Request not found');
      }
      
      const data = await response.json();
      setRequest(data);
      setNewStatus(data.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    const result = await updateStatus(id, newStatus);
    
    if (result.success) {
      setShowStatusChange(false);
      fetchRequest();
    } else {
      setError(result.error);
    }
    
    setIsUpdating(false);
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const updatedRequest = await requestService.generateAISummary(id);
      setRequest(updatedRequest);
    } catch (err) {
      setError(err.message);
    }
    setIsGeneratingSummary(false);
  };

  const handleGenerateTestCases = async () => {
    setIsGeneratingTestCases(true);
    try {
      const updatedRequest = await requestService.generateAITestCases(id);
      setRequest(updatedRequest);
    } catch (err) {
      setError(err.message);
    }
    setIsGeneratingTestCases(false);
  };

  const getNextStatuses = (currentStatus) => {
    const transitions = {
      'New': ['In Progress'],
      'In Progress': ['Done'],
      'Done': []
    };
    return transitions[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Request Details</h1>
        </div>
        <div className="loading-state">Loading request...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Request Not Found</h1>
        </div>
        <Card>
          <p className="not-found-text">{error || 'The request could not be found.'}</p>
          <Link to="/requests">
            <Button variant="primary">Back to Requests</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const nextStatuses = getNextStatuses(request.status);
  const positiveTests = request.ai_positive_tests ? JSON.parse(request.ai_positive_tests) : [];
  const negativeTests = request.ai_negative_tests ? JSON.parse(request.ai_negative_tests) : [];

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/requests">
          <Button variant="secondary">← Back to Requests</Button>
        </Link>
        <h1 className="page-title">Request Details</h1>
        <div className="page-header-actions">
          {isAdmin && nextStatuses.length > 0 && !showStatusChange && (
            <Button 
              variant="primary" 
              onClick={() => setShowStatusChange(true)}
            >
              Change Status
            </Button>
          )}
        </div>
      </div>

      <Card className="request-details-card">
        {showStatusChange && isAdmin && (
          <div className="status-change-section">
            <h3 className="status-change-title">Change Request Status</h3>
            <form onSubmit={handleStatusChange}>
              <Input
                type="select"
                label="New Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={nextStatuses}
              />
              <div className="status-change-actions">
                <Button type="submit" variant="primary" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowStatusChange(false);
                    setNewStatus(request.status);
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

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
            <span className="request-details-value">{formatDateTime(request.created_at)}</span>
          </div>
          <div className="request-details-field">
            <span className="request-details-label">Last Updated</span>
            <span className="request-details-value">{formatDateTime(request.updated_at)}</span>
          </div>
        </div>

        {isAdmin && (
          <>
            <div className="ai-section">
              <div className="ai-section-header">
                <h3 className="ai-section-title">AI Summary</h3>
                {!request.ai_summary && (
                  <Button 
                    variant="primary" 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                  </Button>
                )}
              </div>
              {request.ai_summary ? (
                <div className="ai-content">
                  <p className="ai-text">{request.ai_summary}</p>
                </div>
              ) : (
                <p className="ai-placeholder">No summary generated yet</p>
              )}
            </div>

            <div className="ai-section">
              <div className="ai-section-header">
                <h3 className="ai-section-title">AI Test Cases</h3>
                {positiveTests.length === 0 && negativeTests.length === 0 && (
                  <Button 
                    variant="primary" 
                    onClick={handleGenerateTestCases}
                    disabled={isGeneratingTestCases}
                  >
                    {isGeneratingTestCases ? 'Generating...' : 'Generate Test Cases'}
                  </Button>
                )}
              </div>
              {positiveTests.length > 0 || negativeTests.length > 0 ? (
                <div className="ai-content">
                  <div className="test-cases-group">
                    <h4 className="test-cases-subtitle">Positive Test Cases</h4>
                    <ul className="test-cases-list">
                      {positiveTests.map((test, index) => (
                        <li key={index} className="test-case-item test-case-positive">
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="test-cases-group">
                    <h4 className="test-cases-subtitle">Negative Test Cases</h4>
                    <ul className="test-cases-list">
                      {negativeTests.map((test, index) => (
                        <li key={index} className="test-case-item test-case-negative">
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="ai-placeholder">No test cases generated yet</p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default RequestDetails;
