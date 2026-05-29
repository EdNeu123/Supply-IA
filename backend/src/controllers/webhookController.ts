import { GoogleGenAI } from "@google/genai";
import { Request, Response } from "express";
import { env } from "../config/env";
import { rfqModel } from "../models/rfqModel";
import { supplierModel } from "../models/supplierModel";
import { productModel } from "../models/productModel";
import { telegramService } from "../services/telegramService";
import { processarResposta } from "./quoteController";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DraftQuote {
  unitPrice:    number | null;
  minQuantity:  number | null;
  leadTimeDays: number | null;
  validityDays: number | null;
}

type ActiveField = "unitPrice" | "minQuantity" | "leadTimeDays" | "validityDays" | null;

const FIELD_ORDER: ActiveField[] = [
  "unitPrice",
  "minQuantity",
  "leadTimeDays",
  "validityDays",
];

const FIELD_QUESTIONS: Record<NonNullable<ActiveField>, string[]> = {
  unitPrice:    ["Qual o preço unitário?", "Como fica o valor por unidade?", "Qual o preço por unidade?"],
  minQuantity:  ["Tem pedido mínimo?", "Qual a quantidade mínima?", "Tem quantidade mínima de pedido?"],
  leadTimeDays: ["Quando você consegue entregar?", "Qual o prazo de entrega?", "Em quanto tempo você entrega?"],
  validityDays: ["Por quanto tempo esse preço é válido?", "Até quando vale essa proposta?", "Qual a validade dessa cotação?"],
};

function proximaPergunta(draft: DraftQuote, exclude?: ActiveField): ActiveField {
  for (const field of FIELD_ORDER) {
    if (field !== exclude && draft[field as keyof DraftQuote] === null) {
      return field;
    }
  }
  return null;
}

function getPergunta(field: ActiveField, index = 0): string {
  if (!field) return "";
  const perguntas = FIELD_QUESTIONS[field];
  return perguntas[index % perguntas.length];
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function diasParaDiaSemana(targetDay: number): number {
  const diff = (targetDay - new Date().getDay() + 7) % 7;
  return diff === 0 ? 7 : diff;
}

function buildDateContext(): string {
  const hoje = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const map: [string, number][] = [
    ["terça / terça-feira",   diasParaDiaSemana(2)],
    ["quarta / quarta-feira", diasParaDiaSemana(3)],
    ["quinta / quinta-feira", diasParaDiaSemana(4)],
    ["sexta / sexta-feira",   diasParaDiaSemana(5)],
    ["sábado",                diasParaDiaSemana(6)],
    ["segunda / segunda-feira", diasParaDiaSemana(1)],
    ["domingo",               diasParaDiaSemana(0)],
  ];

  return `Hoje: ${hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
Conversões de prazo (USE SEMPRE — nunca peça "em dias"):
  hoje / imediato / pronta entrega → 0
  amanhã (${fmt(amanha)}) → 1
  depois de amanhã → 2
  essa semana / fim de semana → ${diasParaDiaSemana(6)}
  semana que vem → ${diasParaDiaSemana(1) + 7}
${map.map(([k, v]) => `  ${k} que vem → ${v} dias`).join("\n")}
  Data absoluta (ex: "30/05"): calcule diferença em dias corridos a partir de ${fmt(hoje)}.`;
}

function buildPrompt(productContext: string, draft: DraftQuote, activeField: ActiveField, text: string): string {
  const fieldLabels: Record<NonNullable<ActiveField>, string> = {
    unitPrice:    "preço unitário (R$ por unidade)",
    minQuantity:  "quantidade mínima de pedido (número inteiro; 'sem mínimo' = 1)",
    leadTimeDays: "prazo de entrega em DIAS CORRIDOS a partir de hoje",
    validityDays: "validade da cotação em DIAS a partir de hoje",
  };

  const campoAtivo = activeField
    ? `Campo que você ESTÁ COLETANDO AGORA: ${activeField} → ${fieldLabels[activeField]}`
    : "Todos os campos já foram coletados.";

  const statusDraft = Object.entries(draft)
    .map(([k, v]) => `  ${k}: ${v !== null ? v : "null (falta)"}`)
    .join("\n");

  return `Você é Lia, assistente de compras da Supply IA, conversando no Telegram com um fornecedor.

${buildDateContext()}

Produto: ${productContext}
Rascunho atual:
${statusDraft}

${campoAtivo}
Mensagem do fornecedor: "${text}"

TAREFA PRINCIPAL:
Extraia o valor do campo ATIVO acima a partir da mensagem. Se o fornecedor enviar vários dados juntos, extraia TODOS.
- "amanhã" → 1
- "14,99" → 14.99
- "sem mínimo" → 1

RETORNO — SOMENTE JSON, SEM MARKDOWN:
{
  "extracted": {
    "unitPrice": number | null,
    "minQuantity": number | null,
    "leadTimeDays": number | null,
    "validityDays": number | null
  },
  "isMultiField": boolean,
  "isCanceled": boolean,
  "replyMessage": "Confirmação curta, sem fazer a próxima pergunta"
}`;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const webhookController = {
  async handle(req: Request, res: Response) {
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret)
      return res.status(401).send("Unauthorized");

    const { message } = req.body;

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
      if (text.startsWith("/start")) {
        const token = text.split(" ")[1];
        if (token) {
          const supplier = await supplierModel.findByInviteToken(token);
          if (supplier) {
            await supplierModel.update(supplier.ownerId, supplier.id, {
              telegramChatId: chatId,
              status: "active",
            });
            await telegramService.sendMessage(chatId, "✅ Cadastro concluído! Você receberá cotações por aqui. 😊");
          }
        }
        return res.status(200).send("OK");
      }

      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(chatId, "⚠️ Cadastro não encontrado. Acesse o link de convite.");
        return res.status(200).send("OK");
      }

      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(chatId, "Sem cotações abertas no momento. Avisamos quando precisar. 😊");
        return res.status(200).send("OK");
      }

      const product = await productModel.findById(supplier.ownerId, rfq.productId);
      const productContext = product
        ? `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`
        : "Produto não identificado";

      const draft: DraftQuote = supplier.draftQuote ?? {
        unitPrice: null, minQuantity: null, leadTimeDays: null, validityDays: null,
      };
      const activeField: ActiveField = supplier.activeField ?? proximaPergunta(draft);

      const geminiResponse = await ai.models.generateContent({
        model:    "gemini-2.5-flash-lite",
        contents: buildPrompt(productContext, draft, activeField, text),
      });

      const rawText = (geminiResponse.text ?? "")
        .replace(/```json/g, "").replace(/```/g, "").trim();

      const aiResponse = JSON.parse(rawText);

      if (aiResponse.isCanceled) {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null, activeField: null,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Blindagem: Evita quebra se o Gemini esquecer de mandar a chave 'extracted' 
      const extracted = aiResponse.extracted || {};

      // Função limpa-trilhos: converte string "19,99" para float 19.99 garantido
      const parseNumber = (val: any) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      };

      // Atualiza com conversão rigorosa
      const updatedDraft: DraftQuote = {
        unitPrice:    parseNumber(extracted.unitPrice)    ?? draft.unitPrice,
        minQuantity:  parseNumber(extracted.minQuantity)  ?? draft.minQuantity,
        leadTimeDays: parseNumber(extracted.leadTimeDays) ?? draft.leadTimeDays,
        validityDays: parseNumber(extracted.validityDays) ?? draft.validityDays,
      };

      const nextField = proximaPergunta(updatedDraft);
      const isComplete = nextField === null;

      if (isComplete) {
        await processarResposta(
          rfq.id, supplier.id,
          `Cotação estruturada via Lia: ${JSON.stringify(updatedDraft)}`,
          supplier.ownerId,
          {
            unitPrice:    updatedDraft.unitPrice,
            minQuantity:  updatedDraft.minQuantity,
            leadTimeDays: updatedDraft.leadTimeDays,
            validityDays: updatedDraft.validityDays,
          }
        );
        
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null, activeField: null,
        });

        const confirmMsg = aiResponse.replyMessage && aiResponse.replyMessage.trim()
          ? `${aiResponse.replyMessage}\n\n✅ Proposta registrada com sucesso! Muito obrigado. 😊`
          : "✅ Proposta registrada com sucesso! Muito obrigado. 😊";
        await telegramService.sendMessage(chatId, confirmMsg);

      } else {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote:  updatedDraft,
          activeField: nextField,
        });

        const pergunta = getPergunta(nextField);
        const reply = aiResponse.replyMessage && aiResponse.replyMessage.trim()
          ? `${aiResponse.replyMessage} ${pergunta}`
          : pergunta;
        await telegramService.sendMessage(chatId, reply);
      }

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService
        .sendMessage(chatId, "⚠️ Deu um probleminha técnico aqui. Pode repetir a última resposta por favor?")
        .catch(() => {});
    }

    return res.status(200).send("OK");
  },
};