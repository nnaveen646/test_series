import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({
  baseURL,
  timeout: 10000,
});

export const registerUser = (payload) => api.post('/auth/register', payload);
export const loginUser = (payload) => api.post('/auth/login', payload);
export const sendOtp = (payload) => api.post('/auth/otp/send', payload);
export const verifyOtp = (payload) => api.post('/auth/otp/verify', payload);

export const fetchTests = () => api.get('/tests');
export const fetchTest = (id) => api.get(`/tests/${id}`);
export const submitAttempt = (payload) => api.post('/attempts', payload);
export const fetchAttempts = (userId) => api.get(`/attempts/user/${userId}`);
export const fetchUserStats = (userId) => api.get(`/user/${userId}/stats`);

export const adminLogin = (payload) => api.post('/auth/login', payload);
export const adminFetchTests = () => api.get('/admin/tests');
export const adminDeleteTest = (id) => api.delete(`/admin/tests/${id}`);
export const adminEditTest = (id, payload) => api.put(`/admin/tests/${id}`, payload);
export const adminUploadTests = (formData) => api.post('/admin/upload-tests', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const resetPassword = (payload) => api.post('/auth/reset-password', payload);

export const fetchUserByPhone = (phone) => api.get('/users/by-phone', { params: { phone } });
