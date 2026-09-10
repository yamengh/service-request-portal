import apiCall from './api';

export const getRequests = async () => {
  return apiCall('/requests');
};

export const getRequestById = async (id) => {
  return apiCall(`/requests/${id}`);
};

export const createRequest = async (requestData) => {
  return apiCall('/requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
};

export const updateRequestStatus = async (id, status) => {
  return apiCall(`/requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const generateAISummary = async (id) => {
  return apiCall(`/requests/${id}/summarize`, {
    method: 'POST',
  });
};

export const generateAITestCases = async (id) => {
  return apiCall(`/requests/${id}/test-cases`, {
    method: 'POST',
  });
};
