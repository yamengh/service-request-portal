import apiCall from './api';

export const getNotifications = async () => {
  return apiCall('/notifications');
};

export const markAsRead = async (id) => {
  return apiCall(`/notifications/${id}/read`, {
    method: 'PUT',
  });
};

export const getUnreadCount = async () => {
  return apiCall('/notifications/unread-count');
};
