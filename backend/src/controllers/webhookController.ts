import { GoogleGenAI } from "@google/genai";
import { Request, Response } from "express";
import { env } from "../config/env";
import { rfqModel } from "../models/rfqModel";
import { supplierModel } from "../models/supplierModel";
import { productModel } from "../models/productModel"; // 👈 Import necessário
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

      // Busca os detalhes reais do produto para a IA não ficar genérica
      const product = await productModel.findById(supplier.ownerId, rfq.productId);
      const productContext = product 
        ? `Produto: ${product.name} | SKU: ${product.sku || 'N/A'}`
        : "Detalhes do produto não encontrados.";

      // Puxa a memória da conversa ou começa uma nova
      const historicoAtual = supplier.chatHistory || "";
      const novoHistorico = historicoAtual + `\nFornecedor: ${text}`;

      const prompt = `
        Você é um assistente de suprimentos humano e direto, negociando via Telegram com um fornecedor.
        
        DADOS DO PRODUTO COTADO AGORA:
        ${productContext}

        HISTÓRICO DA CONVERSA:
        """
        ${novoHistorico}
        """
        
        OBJETIVO: 
        Coletar EXATAMENTE 4 informações do fornecedor de forma fluida:
        1. Preço unitário
        2. Quantidade mínima
        3. Prazo de entrega (em dias)
        4. Validade da cotação (em dias)
        
        REGRAS DE COMPORTAMENTO:
        1. ADAPTAÇÃO AO PRODUTO: Se o fornecedor perguntar detalhes técnicos (ex: marca, tamanho), responda com base nos DADOS DO PRODUTO acima. Se a informação não estiver lá, diga de forma natural: "A princípio não temos restrição, pode cotar a sua melhor opção".
        2. PASSO A PASSO HUMANO: Analise todo o histórico. Se AINDA FALTAR informação, isQuote = false. Gere uma "replyMessage" natural e curta perguntando APENAS o que falta (ex: "Show, e qual o prazo de entrega?"). NUNCA mande uma lista robótica do que falta.
        3. MEMÓRIA: O que o fornecedor já respondeu nas mensagens anteriores do histórico continua valendo. Extraia tudo.
        4. SUCESSO: Se os 4 itens já estiverem presentes no histórico inteiro, isQuote = true e a replyMessage deve ser um agradecimento (ex: "✅ Proposta registrada com sucesso! Obrigado.").
        
        Extraia os valores como números.
        
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
        // Atualiza a memória com a pergunta que a IA acabou de fazer
        await supplierModel.update(supplier.ownerId, supplier.id, { 
          chatHistory: novoHistorico + `\nAssistente: ${aiResponse.replyMessage}` 
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Tudo preenchido: salva a cotação oficial
      await processarResposta(rfq.id, supplier.id, novoHistorico, supplier.ownerId, {
        unitPrice: aiResponse.unitPrice,
        minQuantity: aiResponse.minQuantity,
        leadTimeDays: aiResponse.leadTimeDays,
        validityDays: aiResponse.validityDays
      });
      
      // Limpa a memória para a próxima cotação
      await supplierModel.update(supplier.ownerId, supplier.id, { chatHistory: "" });
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService.sendMessage(chatId, "⚠️ Desculpe, não entendi. Pode repetir?").catch(() => {});
    }

    return res.status(200).send("OK");
  },
};