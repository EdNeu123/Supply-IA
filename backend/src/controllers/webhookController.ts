import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { rfqModel } from '../models/rfqModel';
import { supplierModel } from '../models/supplierModel';
import { telegramService } from '../services/telegramService';
import { processarResposta } from './quoteController';

// Inicializa o Gemini (certifique-se de ter GEMINI_API_KEY no seu .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

      // Caso B: resposta de cotação ou bate-papo
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

      // --- MÁGICA DA IA AQUI ---
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        Você é um assistente de suprimentos interagindo com um fornecedor.
        O sistema enviou um pedido de cotação para ele, e ele respondeu: "${text}"
        
        Analise a mensagem. Se ele estiver passando preços ou prazos, considere como uma proposta válida. Se for uma pergunta, dúvida ou apenas um cumprimento, considere como um bate-papo.
        
        Retorne APENAS um objeto JSON válido, sem formatação markdown (sem \`\`\`json), estritamente com esta estrutura:
        {
          "isQuote": boolean,
          "replyMessage": string // Se isQuote for false, responda a dúvida educadamente para ajudar o fornecedor (ex: "Para este item não exigimos marca específica, envie sua melhor opção."). Se for true, responda: "✅ Proposta registrada com sucesso no sistema! Obrigado."
        }
      `;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResponse = JSON.parse(rawText);

      // Se for apenas dúvida/conversa, responde via Telegram e NÃO avança para salvar no banco
      if (!aiResponse.isQuote) {
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send('OK');
      }

      // Se for uma cotação, salva no banco e manda a confirmação gerada pela IA
      await processarResposta(rfq.id, supplier.id, text, supplier.ownerId);
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error('Erro no webhook:', error);
      // Evita o vácuo mesmo se a IA ou o banco derem pau
      await telegramService.sendMessage(chatId, '⚠️ Desculpe, ocorreu um erro. Você poderia reenviar sua mensagem informando preço e prazo?').catch(() => {});
    }

    return res.status(200).send('OK');
  },
};