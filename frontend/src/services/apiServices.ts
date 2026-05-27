import { api } from './api';
import { RFQ, Quote, PurchaseOrder, Movimentacao } from '@/models/types';

export const rfqService = {
  list: async (): Promise<RFQ[]> => (await api.get('/rfqs')).data,
  trigger: async (data: { productId: string; supplierIds: string[] }) => (await api.post('/rfqs', data)).data,
};

export const quoteService = {
  list: async (): Promise<Quote[]> => (await api.get('/quotes')).data,
  simulate: async (data: { rfqId: string; supplierId: string; rawReply: string }) =>
    (await api.post('/quotes/simulate', data)).data,
};

export const purchaseOrderService = {
  list: async (): Promise<PurchaseOrder[]> => (await api.get('/purchase-orders')).data,
  create: async (data: Partial<PurchaseOrder>) => (await api.post('/purchase-orders', data)).data,
  updateStatus: async (id: string, status: string) =>
    (await api.put(`/purchase-orders/${id}/status`, { status })).data,
};

export const movimentacaoService = {
  list: async (): Promise<Movimentacao[]> => (await api.get('/movimentacoes')).data,
  create: async (data: { productId: string; tipo: string; quantidade: number; motivo?: string }) =>
    (await api.post('/movimentacoes', data)).data,
};
