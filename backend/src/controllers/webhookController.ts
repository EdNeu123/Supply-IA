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
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret)
      return res.status(401).send("Unauthorized");

    const { message } = req.body;
    if (!message?.text) return res.status(200).send("OK");

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

      const prompt = `
        Você é um assistente de suprimentos conversando com um fornecedor.
        Aqui está o histórico atual da conversa sobre a cotação:
        """
        ${novoHistorico}
        """
        
        REGRA 1 - DÚVIDAS: Se o fornecedor perguntar algo técnico (ex: qual marca?), responda: "Não exigimos marca específica, envie a melhor opção". Nunca devolva a pergunta.
        
        REGRA 2 - DADOS OBRIGATÓRIOS: A cotação só está completa se o HISTÓRICO INTEIRO contiver os 4 itens:
        1. Preço unitário
        2. Quantidade mínima
        3. Prazo de entrega
        4. Validade da cotação
        
        Instruções:
        - Se AINDA FALTAR algum dos 4 itens: isQuote = false. Agradeça o que foi enviado e pergunte APENAS O QUE FALTA de forma natural. NUNCA peça para enviar tudo de novo numa mensagem só.
        - Se os 4 itens estiverem presentes: isQuote = true. Responda: "✅ Proposta registrada com sucesso no sistema! Obrigado."
        
        Extraia os valores como números (prazos/validades em dias, ex: "terça que vem" = 5).
        
        Retorne APENAS um JSON válido, sem formatação markdown:
        {
          "isQuote": boolean,
          "replyMessage": string,
          "unitPrice": number | null,
          "minQuantity": number | null,
          "leadTimeDays": number | null,
          "validityDays": number | null
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });

      const rawText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiResponse = JSON.parse(rawText);

      if (!aiResponse.isQuote) {
        // Salva a interação (pergunta + resposta) na memória temporária do banco
        await supplierModel.update(supplier.ownerId, supplier.id, { 
          chatHistory: novoHistorico + `\nAssistente: ${aiResponse.replyMessage}` 
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
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

    return res.status(200).send("OK");
  },
};