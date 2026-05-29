import { GoogleGenAI } from "@google/genai";
import { Request, Response } from "express";
import { env } from "../config/env";
import { rfqModel } from "../models/rfqModel";
import { supplierModel } from "../models/supplierModel";
import { productModel } from "../models/productModel";
import { telegramService } from "../services/telegramService";
import { processarResposta } from "./quoteController";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ─── Helpers de data ─────────────────────────────────────────────────────────

function diasParaDiaSemana(targetDay: number): number {
  const diff = (targetDay - new Date().getDay() + 7) % 7;
  return diff === 0 ? 7 : diff; // "terça que vem" = próxima terça, nunca hoje
}

function buildDateContext(): string {
  const hoje = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const diasSemana = [
    ["domingo",       diasParaDiaSemana(0)],
    ["segunda",       diasParaDiaSemana(1)],
    ["segunda-feira", diasParaDiaSemana(1)],
    ["terça",         diasParaDiaSemana(2)],
    ["terca",         diasParaDiaSemana(2)],
    ["terça-feira",   diasParaDiaSemana(2)],
    ["quarta",        diasParaDiaSemana(3)],
    ["quarta-feira",  diasParaDiaSemana(3)],
    ["quinta",        diasParaDiaSemana(4)],
    ["quinta-feira",  diasParaDiaSemana(4)],
    ["sexta",         diasParaDiaSemana(5)],
    ["sexta-feira",   diasParaDiaSemana(5)],
    ["sábado",        diasParaDiaSemana(6)],
    ["sabado",        diasParaDiaSemana(6)],
  ] as [string, number][];

  const linhasDias = diasSemana
    .filter(([k]) => !["terca", "sabado"].includes(k)) // remove duplicatas sem acento
    .map(([k, v]) => `  - "${k} que vem" / "próxima ${k}" → ${v} dias`)
    .join("\n");

  return `Hoje é ${hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}.

Tabela de conversão de prazos (calcule SEMPRE, nunca peça ao fornecedor):
  - "hoje" / "imediato" / "pronta entrega" → 0
  - "amanhã" (${fmt(amanha)}) → 1
  - "depois de amanhã" → 2
  - "essa semana" / "fim de semana" → ${diasParaDiaSemana(6)}
  - "semana que vem" / "próxima semana" → ${diasParaDiaSemana(1) + 7}
${linhasDias}
  - Data absoluta (ex: "30/05", "05/06"): calcule a diferença em dias corridos entre hoje (${fmt(hoje)}) e a data.`;
}

// ─── Build prompt ─────────────────────────────────────────────────────────────

interface DraftQuote {
  unitPrice:    number | null;
  minQuantity:  number | null;
  leadTimeDays: number | null;
  validityDays: number | null;
}

function buildPrompt(
  productContext: string,
  draft: DraftQuote,
  text: string
): string {
  // Mostra quais campos já estão preenchidos para o modelo não perguntar de novo
  const status = Object.entries(draft)
    .map(([k, v]) => `  ${k}: ${v !== null ? v : "❌ FALTA"}`)
    .join("\n");

  return `
Você é Lia, assistente virtual de compras da Supply IA. Conversa no Telegram com fornecedores para coletar dados de cotação.

═══════════════════════════════════════════
CONTEXTO
═══════════════════════════════════════════
Produto: ${productContext}
${buildDateContext()}

Estado atual do rascunho (campos JÁ COLETADOS — NÃO PERGUNTE DE NOVO):
${status}

Nova mensagem do fornecedor: "${text}"

═══════════════════════════════════════════
CAMPOS A COLETAR
═══════════════════════════════════════════
1. unitPrice      → Preço unitário em R$ (decimal)
2. minQuantity    → Quantidade mínima (inteiro; "sem mínimo" = 1)
3. leadTimeDays   → Prazo de entrega em DIAS CORRIDOS (inteiro ≥ 0)
4. validityDays   → Validade da cotação em DIAS (inteiro ≥ 1)

═══════════════════════════════════════════
REGRAS DE INTERPRETAÇÃO
═══════════════════════════════════════════

PRAZOS: use a tabela acima. NUNCA peça "em quantos dias". Você converte.
PREÇOS: aceite R$14,99 / 14,99 / "quatorze reais". Caixa com N unidades → calcule o unitário.
MÍNIMO: "sem mínimo" / "não tem" / "qualquer" → 1.
MÚLTIPLOS DADOS: se o fornecedor der vários dados de uma vez, extraia TODOS. Pergunte só o que genuinamente ficou faltando.
CAMPOS PREENCHIDOS: NÃO volte a perguntar campos que já têm valor no rascunho acima.

═══════════════════════════════════════════
CONDUTA
═══════════════════════════════════════════
- Natural, amigável, direta. Varie confirmações: "Ótimo!", "Perfeito!", "Entendido!", "Ok, anotado!"
- Máximo 1 pergunta por mensagem. Máximo 2 frases.
- Se o fornecedor perguntar algo: responda curto e emende com o que precisa.
  - "Qual marca?" → "A do descritivo ou similar. [próxima pergunta]"
  - "Como é o pagamento?" → "Boleto 30 dias, frete CIF. [próxima pergunta]"
- Se não tiver o produto / sem estoque: isCanceled = true, despedida natural.

═══════════════════════════════════════════
RETORNO
═══════════════════════════════════════════
Retorne SOMENTE JSON válido, sem markdown:
{
  "updatedDraft": {
    "unitPrice": number | null,
    "minQuantity": number | null,
    "leadTimeDays": number | null,
    "validityDays": number | null
  },
  "isQuote": boolean,
  "isCanceled": boolean,
  "replyMessage": "string"
}

Regras:
- updatedDraft: inclua TODOS os 4 campos, mesmo os já preenchidos — copie os valores existentes do rascunho.
- isQuote: true SOMENTE se todos os 4 campos de updatedDraft ≠ null E isCanceled = false.
- Se isQuote = true: replyMessage = "✅ Proposta registrada com sucesso! Muito obrigado. 😊"
- replyMessage: máximo 2 frases.
`.trim();
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const webhookController = {
  async handle(req: Request, res: Response) {
    // 1. Segurança
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret)
      return res.status(401).send("Unauthorized");

    const { message } = req.body;

    // 2. Sem texto (áudio, foto, sticker)
    if (!message?.text) {
      if (message?.chat?.id) {
        await telegramService.sendMessage(
          message.chat.id.toString(),
          "🤖 Ainda não consigo processar áudios ou imagens. Pode digitar sua resposta?"
        );
      }
      return res.status(200).send("OK");
    }

    const chatId = message.chat.id.toString();
    const text   = message.text.trim();

    try {
      // 3. Onboarding
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
              "✅ Cadastro concluído! Você receberá cotações da nossa empresa por aqui. 😊"
            );
          }
        }
        return res.status(200).send("OK");
      }

      // 4. Identificar fornecedor
      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(
          chatId,
          "⚠️ Cadastro não encontrado. Acesse o link de convite enviado pelo gestor."
        );
        return res.status(200).send("OK");
      }

      // 5. RFQ aberta
      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(
          chatId,
          "Olá! Sem cotações abertas no momento. Assim que precisarmos avisamos. 😊"
        );
        return res.status(200).send("OK");
      }

      // 6. Produto
      const product = await productModel.findById(supplier.ownerId, rfq.productId);
      const productContext = product
        ? `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`
        : "Produto não identificado";

      // 7. Rascunho atual — lê do banco (persiste entre mensagens)
      //    IMPORTANTE: draftQuote é um objeto JSON salvo no Firestore,
      //    não texto livre. Por isso não perde dados entre rodadas.
      const draft: DraftQuote = supplier.draftQuote ?? {
        unitPrice:    null,
        minQuantity:  null,
        leadTimeDays: null,
        validityDays: null,
      };

      // 8. Chamada Gemini
      const geminiResponse = await ai.models.generateContent({
        model:    "gemini-2.5-flash-lite",
        contents: buildPrompt(productContext, draft, text),
      });

      const rawText = (geminiResponse.text ?? "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const aiResponse = JSON.parse(rawText) as {
        updatedDraft: DraftQuote;
        isQuote:      boolean;
        isCanceled:   boolean;
        replyMessage: string;
      };

      // 9. Cancelamento (sem estoque, não atende, etc)
      if (aiResponse.isCanceled) {
        // Limpa rascunho ao cancelar
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // 10. Incompleto — persiste rascunho atualizado e continua
      if (!aiResponse.isQuote) {
        // ← CORREÇÃO PRINCIPAL: salva draftQuote (JSON estruturado), não chatHistory (texto)
        // Assim o próximo round lê valores exatos, não reextrai de texto livre
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: aiResponse.updatedDraft,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // 11. Completo — registra cotação e limpa rascunho
      await processarResposta(
        rfq.id,
        supplier.id,
        `Cotação coletada via chat (Lia): ${JSON.stringify(aiResponse.updatedDraft)}`,
        supplier.ownerId,
        {
          unitPrice:    aiResponse.updatedDraft.unitPrice,
          minQuantity:  aiResponse.updatedDraft.minQuantity,
          leadTimeDays: aiResponse.updatedDraft.leadTimeDays,
          validityDays: aiResponse.updatedDraft.validityDays,
        }
      );

      await supplierModel.update(supplier.ownerId, supplier.id, {
        draftQuote: null,
      });
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService
        .sendMessage(chatId, "⚠️ Deu um probleminha aqui. Pode repetir sua última mensagem?")
        .catch(() => {});
    }

    return res.status(200).send("OK");
  },
};