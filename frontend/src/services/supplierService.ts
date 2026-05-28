import { Supplier } from '@/models/types';
import { api } from './api';

export const supplierService = {
  list: async (): Promise<Supplier[]> => (await api.get('/suppliers')).data,
  create: async (data: Partial<Supplier>): Promise<Supplier> => (await api.post('/suppliers', data)).data,
  update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => (await api.put(`/suppliers/${id}`, data)).data,
  delete: async (id: string): Promise<void> => (await api.delete(`/suppliers/${id}`)).data,
  getInviteLink: async (id: string): Promise<string> => {
    const res = await api.get(`/suppliers/${id}/invite-link`);
    return res.data.inviteLink;
  },
};