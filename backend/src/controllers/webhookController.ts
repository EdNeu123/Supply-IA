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
      // Caso A: /start <token>
      if (text.startsWith("/start")) {
        const token = text.split(" ")[1];
        if (token) {
          const supplier = await supplierModel.findByInviteToken(token);
          if (supplier) {
            await supplierModel.update(supplier.ownerId, supplier.id, {
              telegramChatId: chatId,
              status: "active",
            });
            await telegramService.sendMessage(
              chatId,
              "✅ Cadastro concluído! Você receberá nossas cotações por aqui."
            );
          }
        }
        return res.status(200).send("OK");
      }

      // Caso B: resposta de cotação ou bate-papo
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

const prompt = `
        Você é um assistente de compras de uma empresa interagindo via chat com um fornecedor.
        O sistema enviou um pedido de cotação para ele, e ele respondeu: "${text}"
        
        REGRA 1 - DÚVIDAS DO FORNECEDOR:
        Se o fornecedor fizer uma pergunta técnica (ex: qual a marca, cor, tamanho, especificações?), responda SEMPRE de forma educada informando algo como: "Não exigimos uma marca ou especificação exata, pode cotar a melhor opção de custo-benefício que você tem disponível." 
        IMPORTANTE: NUNCA devolva a pergunta para o fornecedor. Assuma a postura de quem está comprando.
        
        REGRA 2 - DADOS OBRIGATÓRIOS DA COTAÇÃO:
        Uma cotação SÓ está completa (isQuote = true) se o fornecedor informar TODOS os 4 itens abaixo na mensagem:
        1. Preço unitário
        2. Quantidade mínima
        3. Prazo de entrega
        4. Validade da cotação (ex: quantos dias o preço é mantido)
        
        Instruções de Resposta (replyMessage):
        - Se for uma dúvida ou se faltar QUALQUER UM dos 4 itens, defina isQuote = false. Na sua resposta, esclareça a dúvida (se houver) e liste EXATAMENTE os itens que ainda faltam ele informar.
        - Se ele enviou os 4 itens corretamente, defina isQuote = true e responda: "✅ Proposta registrada com sucesso no sistema! Obrigado."
        
        Extraia os valores numéricos (prazos/validades em dias inteiros, ex: "terça que vem" = 5, "1 semana" = 7).
        
        Retorne APENAS um objeto JSON válido, sem formatação markdown, estritamente com esta estrutura:
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

      // Bloqueia e responde pedindo os itens que faltam
      if (!aiResponse.isQuote) {
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Passa a resposta em texto E os dados já mastigados pela IA
      await processarResposta(rfq.id, supplier.id, text, supplier.ownerId, {
        unitPrice: aiResponse.unitPrice,
        minQuantity: aiResponse.minQuantity,
        leadTimeDays: aiResponse.leadTimeDays,
        validityDays: aiResponse.validityDays
      });
      
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService.sendMessage(
        chatId,
        "⚠️ Desculpe, não consegui processar. Pode me enviar novamente com preço unitário, quantidade mínima, prazo de entrega e validade?"
      ).catch(() => {});
    }

    return res.status(200).send("OK");
  },
};