import { createContext, useContext, useState, useEffect } from 'react';
import * as requestService from '../services/requestService';

const RequestsContext = createContext(null);

export const RequestsProvider = ({ children }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await requestService.getRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addRequest = async (newRequest) => {
    try {
      const createdRequest = await requestService.createRequest(newRequest);
      setRequests([createdRequest, ...requests]);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const updatedRequest = await requestService.updateRequestStatus(id, status);
      setRequests(requests.map(req => req.id === id ? updatedRequest : req));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <RequestsContext.Provider value={{ requests, addRequest, updateStatus, loading, error, fetchRequests }}>
      {children}
    </RequestsContext.Provider>
  );
};

export const useRequests = () => {
  const context = useContext(RequestsContext);
  if (!context) {
    throw new Error('useRequests must be used within a RequestsProvider');
  }
  return context;
};
