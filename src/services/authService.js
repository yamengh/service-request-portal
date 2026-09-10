import apiCall from './api';

export const login = async (username, password) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
