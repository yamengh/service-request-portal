import api from './api';

export const serviceService = {
  // Get all available services
  getAllServices: async () => {
    const response = await api.get('/services');
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  // Get user's subscriptions
  getMySubscriptions: async () => {
    const response = await api.get('/services/subscriptions/my');
    return response.data;
  },

  // Subscribe to a service
  subscribeToService: async (serviceId) => {
    const response = await api.post(`/services/subscriptions/${serviceId}`);
    return response.data;
  },

  // Unsubscribe from a service
  unsubscribeFromService: async (serviceId) => {
    const response = await api.delete(`/services/subscriptions/${serviceId}`);
    return response.data;
  }
};