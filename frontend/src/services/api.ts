import axios from 'axios';
import { auth } from '@/config/firebase';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  return config;
});
