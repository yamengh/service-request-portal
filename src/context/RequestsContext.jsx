import { createContext, useContext, useState } from 'react';
import mockRequests from '../data/mockRequests';

const RequestsContext = createContext(null);

export const RequestsProvider = ({ children }) => {
  const [requests, setRequests] = useState(mockRequests);

  const addRequest = (newRequest) => {
    const requestWithId = {
      ...newRequest,
      id: `REQ-${String(requests.length + 1).padStart(3, '0')}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRequests([requestWithId, ...requests]);
  };

  return (
    <RequestsContext.Provider value={{ requests, addRequest }}>
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
