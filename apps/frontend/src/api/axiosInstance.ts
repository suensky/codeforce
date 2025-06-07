import axios from 'axios';
import { useAuthStore } from '../stores/authStore'; // Assuming authStore is set up

const axiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'production'
    ? '/api' // In production, frontend serves backend from /api path
    : 'http://localhost:3000/api', // For development, directly to backend port
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Only add PAT for requests to our backend API
    if (config.url && (config.url.startsWith('/api') || config.url.startsWith('http://localhost:3000/api'))) {
      const pat = useAuthStore.getState().gitlabPat; // Get PAT from Zustand store
      if (pat && config.headers) {
        config.headers['X-GitLab-PAT'] = pat; // Custom header for backend to pick up
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
