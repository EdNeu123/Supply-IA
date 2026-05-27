import { api } from './api';
import { Product } from '@/models/types';

export const productService = {
  list: async (): Promise<Product[]> => (await api.get('/products')).data,
  create: async (data: Partial<Product>): Promise<Product> => (await api.post('/products', data)).data,
  update: async (id: string, data: Partial<Product>): Promise<Product> => (await api.put(`/products/${id}`, data)).data,
  delete: async (id: string): Promise<void> => (await api.delete(`/products/${id}`)).data,
};
