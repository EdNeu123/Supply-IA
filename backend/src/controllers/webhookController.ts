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
    
    if (!message?.text) {
      return res.status(200).send("OK");
    }

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
        return res.status(200).send("OK");
      }

      await telegramService.sendChatAction(chatId);

      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(chatId, "⚠️ Cadastro não encontrado. Acesse o link de convite novamente.");
        return res.status(200).send("OK");
      }

      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(chatId, "⚠️ Não há cotações abertas para você no momento.");
        return res.status(200).send("OK");
      }

      // Puxa a memória da conversa ou começa uma nova
      const historicoAtual = supplier.chatHistory || "";
      const novoHistorico = historicoAtual + `\nFornecedor: ${text}`;

      // Configuração de data atual para cálculo de prazos relativos no bot
      const hoje = new Date();
      const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const infoHoje = `Hoje é ${diasSemana[hoje.getDay()]} (data atual: ${hoje.toLocaleDateString('pt-BR')}).`;

      const prompt = `Você é um assistente de suprimentos conversando com um fornecedor.
Leia TODO o histórico de conversa abaixo para analisar o estado da cotação:
"""
${novoHistorico}
"""

INFORMAÇÕES DE CONTEXTO TEMPORAL:
- ${infoHoje}
- Se o fornecedor usar prazos relativos (ex: "quinta que vem", "amanhã", "daqui a 3 dias"), calcule a quantidade de dias a partir da data atual e preencha como um número inteiro.
- Se o fornecedor disser que "não tem quantidade mínima" ou "qualquer quantia", defina minQuantity como 0.

Seu objetivo é extrair 4 dados obrigatórios do histórico:
1. Preço unitário (unitPrice)
2. Quantidade mínima (minQuantity)
3. Prazo de entrega em dias (leadTimeDays)
4. Validade da cotação em dias (validityDays)

REGRA 1: Se o fornecedor tiver dúvidas técnicas (ex: marca), responda: "Não exigimos marca específica, envie a melhor opção."
REGRA 2: Verifique o histórico COMPLETO. Se AINDA FALTAR algum dos 4 dados, 'isQuote' = false. Agradeça o que foi enviado e pergunte APENAS pelo dado que falta.
REGRA 3: Se TODOS os 4 dados já estiverem presentes em qualquer parte do histórico, 'isQuote' = true. Responda exatamente: "✅ Proposta registrada com sucesso no sistema! Obrigado."

CRÍTICO: Se 'isQuote' for true, você DEVE varrer todo o histórico, capturar os valores corretos de todos os 4 itens e preenchê-los no JSON. NÃO retorne null para valores que foram informados em mensagens anteriores do histórico.

Retorne APENAS o JSON estruturado abaixo:
{
  "isQuote": boolean,
  "replyMessage": "Sua resposta aqui",
  "unitPrice": number | null,
  "minQuantity": number | null,
  "leadTimeDays": number | null,
  "validityDays": number | null
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text?.trim() || "{}";
      let aiResponse;
      try {
        aiResponse = JSON.parse(rawText);
      } catch (parseError) {
        console.error("Erro no parse do JSON do Gemini no webhook:", rawText);
        throw new Error("Retorno inválido da IA.");
      }

      if (!aiResponse.isQuote) {
        // Salva a interação na memória temporária do banco
        await supplierModel.update(supplier.ownerId, supplier.id, { 
          chatHistory: novoHistorico + `\nAssistente: ${aiResponse.replyMessage}` 
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Se aprovou, manda o histórico completo e os dados populados pro quoteController
      await processarResposta(rfq.id, supplier.id, novoHistorico, supplier.ownerId, {
        unitPrice: aiResponse.unitPrice,
        minQuantity: aiResponse.minQuantity,
        leadTimeDays: aiResponse.leadTimeDays,
        validityDays: aiResponse.validityDays
      });
      
      // DELETA o histórico do banco para limpar a memória temporária
      await supplierModel.update(supplier.ownerId, supplier.id, { chatHistory: "" });
      
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);
      return res.status(200).send("OK");

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService.sendMessage(chatId, "⚠️ Desculpe, tive um problema ao processar sua proposta. Pode repetir os dados?").catch(() => {});
      return res.status(200).send("OK");
    }
  },
};