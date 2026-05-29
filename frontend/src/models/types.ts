export interface Product {
  id: string; name: string; sku: string; currentStock: number;
  avgDailyConsumption: number; leadTimeDays: number; safetyStockDays: number;
  reorderPoint: number; status: 'ok' | 'alerta' | 'critico';
}
export interface Supplier {
  id: string; name: string; whatsapp: string; email: string;
  productIds: string[]; reliabilityScore: number; status: string;
  inviteToken?: string; inviteLink?: string;
}
export interface RFQ {
  id: string; productId: string; supplierIds: string[]; status: string; createdAt: string;
}
export interface Quote {
  id: string; rfqId: string; productId: string; supplierId: string; rawReply: string;
  status: 'sent' | 'answered' | 'error';
  unitPrice?: number; leadTimeDays?: number; minQty?: number; validityDays?: number; createdAt?: string;
}
export interface PurchaseOrder {
  id: string; quoteId: string; productId: string; supplierId: string;
  qty: number; total: number; status: 'created' | 'sent' | 'received' | 'completed'; createdAt: string;
}

export interface Movimentacao {
  id: string;
  productId: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo?: string;
  estoqueAntes: number;
  estoqueDepois: number;
  createdAt: string;
}
