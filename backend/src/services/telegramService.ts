import axios from 'axios';
import { env } from '../config/env';
import { supplierModel } from '../models/supplierModel';

const API = `https://api.telegram.org/bot${env.telegram.botToken}`;

export const telegramService = {
  async sendMessage(chatId: string, text: string) {
    try {
      await axios.post(`${API}/sendMessage`, { chat_id: chatId, text });
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error(`Bot bloqueado pelo fornecedor (chatId: ${chatId})`);
        return { success: false, blocked: true };
      }
      console.error('Erro Telegram:', error.response?.data || error.message);
      return { success: false, blocked: false };
    }
  },

  async enviarRFQ(supplier: any, product: any, rfqId: string) {
    if (!supplier.telegramChatId) return;
    const text = `📦 Cotação solicitada para: *${product.name}*\nQual seu preço, prazo e quantidade mínima?`;
    const result = await this.sendMessage(supplier.telegramChatId, text);
    if (result?.blocked) {
      await supplierModel.update(supplier.ownerId, supplier.id, { status: 'blocked' });
    }
  },
};
