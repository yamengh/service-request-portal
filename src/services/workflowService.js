import api from './api';

export const workflowService = {
  // Get workflow state for a request
  getWorkflowState: async (requestId) => {
    const response = await api.get(`/workflow/state/${requestId}`);
    return response.data;
  },

  // Get workflow history for a request
  getWorkflowHistory: async (requestId) => {
    const response = await api.get(`/workflow/history/${requestId}`);
    return response.data;
  },

  // Approve a request
  approveRequest: async (requestId, reason) => {
    const response = await api.post(`/workflow/approve/${requestId}`, { reason });
    return response.data;
  },

  // Reject a request
  rejectRequest: async (requestId, reason) => {
    const response = await api.post(`/workflow/reject/${requestId}`, { reason });
    return response.data;
  },

  // Assign reviewer to a request
  assignReviewer: async (requestId, reviewerId) => {
    const response = await api.post(`/workflow/assign-reviewer/${requestId}`, { reviewerId });
    return response.data;
  },

  // Get pending reviews
  getPendingReviews: async () => {
    const response = await api.get('/workflow/pending');
    return response.data;
  }
};