import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://pledgepay-production.up.railway.app',
});

// Her istekte token otomatik ekle
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 durumunda otomatik logout
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => {
  const formData = new URLSearchParams();
  formData.append('username', data.email);
  formData.append('password', data.password);
  return API.post('/auth/login', formData);
};
export const getMe = () => API.get('/auth/me');

// Tasks
export const getTasks = () => API.get('/tasks/');
export const createTask = (data) => API.post('/tasks/', data);
export const verifyTask = (taskId, lat, lng) => 
  API.post(`/tasks/${taskId}/verify?user_lat=${lat}&user_lng=${lng}`);
export const forfeitTask = (taskId) => API.post(`/tasks/${taskId}/forfeit`);

// Profile
export const getStats = () => API.get('/profile/stats');
export const getTransactions = () => API.get('/profile/transactions');
export const changePassword = (oldPassword, newPassword) => 
  API.put('/profile/change-password', { old_password: oldPassword, new_password: newPassword });

// Groups
export const getGroups = () => API.get('/groups/');
export const createGroup = (data) => API.post('/groups/', data);
export const joinGroup = (inviteCode) => API.post(`/groups/join/${inviteCode}`);
export const getGroupDetail = (groupId) => API.get(`/groups/${groupId}`);
export const verifyGroup = (groupId, lat, lng) => API.post(`/groups/${groupId}/verify?user_lat=${lat}&user_lng=${lng}`);
export const finalizeGroup = (groupId) => API.post(`/groups/${groupId}/finalize`);
export const inviteByUsername = (groupId, username) => API.post(`/groups/${groupId}/invite/${username}`);

// Notifications
export const getNotifications = () => API.get('/notifications/');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.post('/notifications/read-all');
export const forfeitGroup = (groupId) => API.post(`/groups/${groupId}/forfeit`);

// Archive
export const archiveTask = (taskId) => API.post(`/tasks/${taskId}/archive`);
export const getArchivedTasks = () => API.get('/tasks/archived');