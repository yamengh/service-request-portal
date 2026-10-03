import apiCall from './api';

export const serviceService = {
  // Get all available services
  getAllServices: async () => {
    return apiCall('/services');
  },

  // Get service by ID
  getServiceById: async (id) => {
    return apiCall(`/services/${id}`);
  },

  // Get user's subscriptions
  getMySubscriptions: async () => {
    return apiCall('/services/subscriptions/my');
  },

  // Subscribe to a service
  subscribeToService: async (serviceId) => {
    return apiCall(`/services/subscriptions/${serviceId}`, { method: 'POST' });
  },

  // Unsubscribe from a service
  unsubscribeFromService: async (serviceId) => {
    return apiCall(`/services/subscriptions/${serviceId}`, { method: 'DELETE' });
  }
};