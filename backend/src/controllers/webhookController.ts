import { GoogleGenAI } from "@google/genai";
import { Request, Response } from "express";
import { env } from "../config/env";
import { rfqModel } from "../models/rfqModel";
import { supplierModel } from "../models/supplierModel";
import { telegramService } from "../services/telegramService";
import { processarResposta } from "./quoteController";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const webhookController = {
  async handle(req: Request, res: Response) {
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret) {
      return res.status(401).send("Unauthorized");
    }

    const { message } = req.body;
    
    // 1. Resposta IMEDIATA para o Telegram para evitar timeout e mensagens duplicadas
    res.status(200).send("OK");

    if (!message?.text) return;

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    try {
      if (text.startsWith("/start")) {
        const token = text.split(" ")[1];
        if (token) {
          const supplier = await supplierModel.findByInviteToken(token);
          if (supplier) {
            await supplierModel.update(supplier.ownerId, supplier.id, { telegramChatId: chatId, status: "active" });
            await telegramService.sendMessage(chatId, "✅ Cadastro concluído! Você receberá nossas cotações por aqui.");
          }
        }
        return;
      }

      // 2. Avisa ao fornecedor que a I.A. está "digitando..."
      await telegramService.sendChatAction(chatId);

      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(chatId, "⚠️ Cadastro não encontrado. Acesse o link de convite novamente.");
        return;
      }

      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(chatId, "⚠️ Não há cotações abertas para você no momento.");
        return;
      }

      // Puxa a memória da conversa ou começa uma nova
      const historicoAtual = supplier.chatHistory || "";
      const novoHistorico = historicoAtual + `\nFornecedor: ${text}`;

      // Configuração de datas para que o Gemini entenda prazos relativos no Telegram
      const hoje = new Date();
      const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const infoHoje = `Hoje é ${diasSemana[hoje.getDay()]}, dia ${hoje.toLocaleDateString('pt-BR')}.`;

      const prompt = `Você é um assistente de suprimentos.
Leia TODO o histórico de conversa abaixo para buscar os dados:
"""
${novoHistorico}
"""

INFORMAÇÕES DE CONTEXTO:
- ${infoHoje}
- Se o fornecedor usar datas relativas (ex: "quinta que vem", "amanhã"), faça a conta a partir de hoje e retorne o número de dias inteiros.
- Se o fornecedor disser que "não tem quantia mínima", retorne 0 no campo minQuantity.

Seu objetivo é extrair 4 dados OBRIGATÓRIOS do histórico:
1. Preço unitário
2. Quantidade mínima (minQuantity)
3. Prazo de entrega em dias (leadTimeDays)
4. Validade da cotação em dias (validityDays)

REGRA 1: Se o fornecedor tiver dúvidas técnicas (ex: marca), responda: "Não exigimos marca específica, envie a melhor opção."
REGRA 2: Verifique o histórico COMPLETO. Se AINDA FALTAR algum dos 4 dados, 'isQuote' = false. Agradeça e pergunte APENAS pelo dado que falta.
REGRA 3: Se TODOS os 4 dados já estiverem em alguma parte do histórico, 'isQuote' = true. Responda: "✅ Proposta registrada com sucesso!"

Retorne APENAS um JSON válido. Use null se o dado ainda não foi informado:
{
  "isQuote": boolean,
  "replyMessage": "Sua resposta aqui",
  "unitPrice": 15.50,
  "minQuantity": 100,
  "leadTimeDays": 5,
  "validityDays": 15
}`;

      // Usando o modelo correto (2.5-flash) e forçando JSON
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const aiResponse = JSON.parse(response.text?.trim() || "{}");

      if (!aiResponse.isQuote) {
        // Salva a interação (pergunta + resposta) na memória temporária do banco
        await supplierModel.update(supplier.ownerId, supplier.id, { 
          chatHistory: novoHistorico + `\nAssistente: ${aiResponse.replyMessage}` 
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return;
      }

      // Se aprovou, manda o histórico completo pro quoteController
      await processarResposta(rfq.id, supplier.id, novoHistorico, supplier.ownerId, {
        unitPrice: aiResponse.unitPrice,
        minQuantity: aiResponse.minQuantity,
        leadTimeDays: aiResponse.leadTimeDays,
        validityDays: aiResponse.validityDays
      });
      
      // DELETA o histórico do banco para não acumular lixo
      await supplierModel.update(supplier.ownerId, supplier.id, { chatHistory: "" });
      
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService.sendMessage(chatId, "⚠️ Desculpe, não entendi. Pode repetir?").catch(() => {});
    }
  },
};