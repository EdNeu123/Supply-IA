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

// Campo que o bot está esperando atualmente — salvo no banco junto com draftQuote
type ActiveField = "unitPrice" | "minQuantity" | "leadTimeDays" | "validityDays" | null;

// ─── Ordem de coleta e perguntas ─────────────────────────────────────────────
// O bot sempre segue essa ordem, perguntando um campo por vez.
// Assim quando o fornecedor responde "amanhã" ou "30/05", sabemos exatamente
// a qual campo a resposta pertence.

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

// ─── Prompt focado num único campo ───────────────────────────────────────────
// Estratégia: em vez de pedir tudo e o fornecedor adivinhar o contexto,
// o bot pergunta um campo por vez e passa QUAL campo está esperando.
// Assim "amanhã" = leadTimeDays ou validityDays dependendo do activeField.

function buildPrompt(
  productContext: string,
  draft: DraftQuote,
  activeField: ActiveField,
  text: string
): string {
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

  return `
Você é Lia, assistente de compras da Supply IA, conversando no Telegram com um fornecedor.

${buildDateContext()}

Produto: ${productContext}

Rascunho atual:
${statusDraft}

${campoAtivo}

Mensagem do fornecedor: "${text}"

═══════════════════════════════════════════
TAREFA PRINCIPAL
═══════════════════════════════════════════
Extraia o valor do campo ATIVO acima a partir da mensagem do fornecedor.
Como o campo ativo é conhecido, qualquer expressão temporal ou numérica ambígua
deve ser interpretada como resposta PARA ESSE CAMPO ESPECÍFICO.

Exemplos com activeField = "leadTimeDays":
  - "amanhã" → 1
  - "30/05" → calcule dias a partir de hoje
  - "quinta que vem" → use tabela acima
  - "5" → 5 dias

Exemplos com activeField = "validityDays":
  - "amanhã" → 1 dia de validade
  - "30/05" → calcule dias a partir de hoje
  - "5" → 5 dias de validade
  - "uma semana" → 7

Exemplos com activeField = "unitPrice":
  - "14,99" → 14.99
  - "caixa com 10 por R$50" → 5.0 (calcule o unitário)

Exemplos com activeField = "minQuantity":
  - "sem mínimo" / "qualquer" / "não tem" → 1
  - "caixa de 12" → 12

SE A MENSAGEM CONTIVER MÚLTIPLOS DADOS (ex: "preço 14,99, entrego quinta, mínimo 10, vale 30 dias"):
  Extraia TODOS os campos que conseguir identificar, não só o ativo.
  Marque isMultiField = true.

SE NÃO CONSEGUIR EXTRAIR O VALOR DO CAMPO ATIVO:
  Marque extracted = null e explique na replyMessage de forma natural.

SE O FORNECEDOR PERGUNTAR ALGO:
  Responda curto e natural, depois emende com a pergunta do campo ativo.
  - "Qual marca?" → "A do descritivo ou similar. [pergunta do campo ativo]"
  - "Como paga?" → "Boleto 30 dias, frete CIF. [pergunta do campo ativo]"

SE NÃO TIVER O PRODUTO / SEM ESTOQUE:
  isCanceled = true, replyMessage = despedida natural.

ESTILO: natural, amigável, 1-2 frases, sem repetir a mesma confirmação toda hora.
Varie: "Ótimo!", "Perfeito!", "Entendido!", "Ok, anotado!", "Certo!", "Combinado!"

═══════════════════════════════════════════
RETORNO — SOMENTE JSON, SEM MARKDOWN
═══════════════════════════════════════════
{
  "extracted": {
    "unitPrice": number | null,
    "minQuantity": number | null,
    "leadTimeDays": number | null,
    "validityDays": number | null
  },
  "isMultiField": boolean,
  "isCanceled": boolean,
  "replyMessage": "string (confirmação curta; NÃO inclua a próxima pergunta — o sistema faz isso)"
}

Regra: extracted deve conter TODOS os 4 campos. Para os não extraídos, copie o valor do rascunho atual (pode ser null).
`.trim();
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
      // Onboarding
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
              "✅ Cadastro concluído! Você receberá cotações por aqui. 😊"
            );
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

      // Rascunho e campo ativo — ambos persistidos no banco entre mensagens
      const draft: DraftQuote = supplier.draftQuote ?? {
        unitPrice: null, minQuantity: null, leadTimeDays: null, validityDays: null,
      };
      const activeField: ActiveField = supplier.activeField ?? proximaPergunta(draft);

      // Chamada Gemini
      const geminiResponse = await ai.models.generateContent({
        model:    "gemini-2.5-flash-lite",
        contents: buildPrompt(productContext, draft, activeField, text),
      });

      const rawText = (geminiResponse.text ?? "")
        .replace(/```json/g, "").replace(/```/g, "").trim();

      const aiResponse = JSON.parse(rawText) as {
        extracted:    DraftQuote;
        isMultiField: boolean;
        isCanceled:   boolean;
        replyMessage: string;
      };

      // Cancelamento
      if (aiResponse.isCanceled) {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null, activeField: null,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Mescla o rascunho com o que foi extraído (não sobrescreve campos já preenchidos com null)
      const updatedDraft: DraftQuote = {
        unitPrice:    aiResponse.extracted.unitPrice    ?? draft.unitPrice,
        minQuantity:  aiResponse.extracted.minQuantity  ?? draft.minQuantity,
        leadTimeDays: aiResponse.extracted.leadTimeDays ?? draft.leadTimeDays,
        validityDays: aiResponse.extracted.validityDays ?? draft.validityDays,
      };

      // Próximo campo a perguntar
      const nextField = proximaPergunta(updatedDraft);
      const isComplete = nextField === null;

      if (isComplete) {
        // Registra cotação
        await processarResposta(
          rfq.id, supplier.id,
          `Cotação via Lia: ${JSON.stringify(updatedDraft)}`,
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
        // Confirmação final + resposta da IA em sequência
        const confirmMsg = aiResponse.replyMessage && aiResponse.replyMessage.trim()
          ? `${aiResponse.replyMessage}\n\n✅ Proposta registrada com sucesso! Muito obrigado. 😊`
          : "✅ Proposta registrada com sucesso! Muito obrigado. 😊";
        await telegramService.sendMessage(chatId, confirmMsg);

      } else {
        // Persiste rascunho atualizado e próximo campo ativo
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote:  updatedDraft,
          activeField: nextField,
        });
        // Envia confirmação da IA + a próxima pergunta (determinística, não gerada)
        const pergunta = getPergunta(nextField);
        const reply = aiResponse.replyMessage && aiResponse.replyMessage.trim()
          ? `${aiResponse.replyMessage} ${pergunta}`
          : pergunta;
        await telegramService.sendMessage(chatId, reply);
      }

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService
        .sendMessage(chatId, "⚠️ Deu um probleminha. Pode repetir?")
        .catch(() => {});
    }

    return res.status(200).send("OK");
  },
};