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
      res.status(401).send("Unauthorized");
      return;
    }

    // 1. Resposta imediata para matar o loop de timeout do Telegram
    res.status(200).send("OK");

    const { message } = req.body;
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

      const historicoAtual = supplier.chatHistory || "";
      const novoHistorico = historicoAtual + `\nFornecedor: ${text}`;

      const prompt = `
        Você é um assistente de suprimentos conversando com um fornecedor.
        Aqui está o histórico atual da conversa sobre a cotação:
        """
        ${novoHistorico}
        """
        
        REGRA 1 - DÚVIDAS: Se o fornecedor perguntar algo técnico (ex: qual marca?), responda: "Não exigimos marca específica, envie a melhor opção". Nunca devolva a pergunta.
        
        REGRA 2 - DADOS OBRIGATÓRIOS: A cotação só está completa se tivermos os 4 itens:
        1. Preço unitário
        2. Quantidade mínima
        3. Prazo de entrega
        4. Validade da cotação
        
        IMPORTANTE: No histórico, você verá uma tag [MEMÓRIA DA IA] com os valores extraídos nas mensagens anteriores. SEMPRE mantenha esses valores no seu JSON final e preencha os novos dados informados agora.
        
        Instruções:
        - Se AINDA FALTAR algum dos 4 itens: isQuote = false. Agradeça e pergunte APENAS O QUE FALTA. NUNCA peça para enviar tudo de novo numa mensagem só.
        - Se os 4 itens estiverem presentes: isQuote = true. Responda: "✅ Proposta registrada com sucesso no sistema! Obrigado."
        
        Extraia os valores como números (prazos/validades em dias, ex: "terça que vem" = 5).
        
        Retorne APENAS um JSON válido:
        {
          "isQuote": boolean,
          "replyMessage": string,
          "unitPrice": number | null,
          "minQuantity": number | null,
          "leadTimeDays": number | null,
          "validityDays": number | null
        }
      `;

      // 2. Uso correto do MimeType para forçar o JSON limpo
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const aiResponse = JSON.parse(response.text || "{}");

      if (!aiResponse.isQuote) {
        // 3. Salva o estado invisível na memória para a IA ler no próximo turno
        const memoriaOculta = `\n[MEMÓRIA DA IA: Preço=${aiResponse.unitPrice || null}, Qtd=${aiResponse.minQuantity || null}, Prazo=${aiResponse.leadTimeDays || null}, Validade=${aiResponse.validityDays || null}]`;

        await supplierModel.update(supplier.ownerId, supplier.id, { 
          chatHistory: novoHistorico + `\nAssistente: ${aiResponse.replyMessage}` + memoriaOculta
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return;
      }

      await processarResposta(rfq.id, supplier.id, novoHistorico, supplier.ownerId, {
        unitPrice: aiResponse.unitPrice,
        minQuantity: aiResponse.minQuantity,
        leadTimeDays: aiResponse.leadTimeDays,
        validityDays: aiResponse.validityDays
      });
      
      await supplierModel.update(supplier.ownerId, supplier.id, { chatHistory: "" });
      
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService.sendMessage(chatId, "⚠️ Desculpe, não entendi. Pode repetir?").catch(() => {});
    }
  },
};