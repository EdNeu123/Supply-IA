import { Request, Response } from 'express';
import { supplierModel } from '../models/supplierModel';
import { telegramService } from '../services/telegramService';
import { processarResposta } from './quoteController';
import { rfqModel } from '../models/rfqModel';
import { env } from '../config/env';

export const webhookController = {
  async handle(req: Request, res: Response) {
    if (req.headers['x-telegram-bot-api-secret-token'] !== env.telegram.webhookSecret)
      return res.status(401).send('Unauthorized');

    const { message } = req.body;
    if (!message?.text) return res.status(200).send('OK');

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    try {
      // Caso A: /start <token>
      if (text.startsWith('/start')) {
        const token = text.split(' ')[1];
        if (token) {
          const supplier = await supplierModel.findByInviteToken(token);
          if (supplier) {
            await supplierModel.update(supplier.ownerId, supplier.id, { telegramChatId: chatId, status: 'active' });
            await telegramService.sendMessage(chatId, '✅ Cadastro concluído! Você receberá nossas cotações por aqui.');
          }
        }
        return res.status(200).send('OK');
      }

      // Caso B: resposta de cotação
      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(chatId, '⚠️ Cadastro não encontrado. Acesse o link de convite novamente.');
        return res.status(200).send('OK');
      }

      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(chatId, '⚠️ Não há cotações abertas para você no momento.');
        return res.status(200).send('OK');
      }

      await processarResposta(rfq.id, supplier.id, text, supplier.ownerId);
      await telegramService.sendMessage(chatId, '✅ Proposta recebida! Obrigado.');

    } catch (error) {
      console.error('Erro no webhook:', error);
    }

    return res.status(200).send('OK'); // sempre 200
  },
};
