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

// ─── Ordem de coleta e perguntas ─────────────────────────────────────────────

const FIELD_ORDER: NonNullable<ActiveField>[] = [
  "unitPrice", "minQuantity", "leadTimeDays", "validityDays",
];

const FIELD_QUESTIONS: Record<NonNullable<ActiveField>, string[]> = {
  unitPrice:    ["Qual o preço unitário?", "Como fica o valor por unidade?", "Qual o preço por unidade?"],
  minQuantity:  ["Tem pedido mínimo?", "Qual a quantidade mínima?", "Tem quantidade mínima de pedido?"],
  leadTimeDays: ["Quando você consegue entregar?", "Qual o prazo de entrega?", "Em quanto tempo você entrega?"],
  validityDays: ["Por quanto tempo esse preço é válido?", "Até quando vale essa proposta?", "Qual a validade dessa cotação?"],
};

function proximaField(draft: DraftQuote): ActiveField {
  for (const f of FIELD_ORDER) {
    if (draft[f] === null) return f;
  }
  return null;
}

function getPergunta(field: ActiveField): string {
  if (!field) return "";
  const arr = FIELD_QUESTIONS[field];
  // Rotaciona a pergunta baseado na hora para variar sem estado extra
  return arr[new Date().getMinutes() % arr.length];
}

// ─── Parse seguro do JSON retornado pelo Gemini ───────────────────────────────
// FIX 1: extrai o primeiro bloco JSON do texto, ignorando texto antes/depois
// FIX 2: coerce todos os campos numéricos para Number evitando strings

function parseGeminiJson(raw: string): {
  extracted: DraftQuote;
  isMultiField: boolean;
  isCanceled: boolean;
  replyMessage: string;
} {
  // Remove markdown fences
  let cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Extrai o primeiro objeto JSON válido do texto
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Gemini não retornou JSON válido. Raw: ${raw.slice(0, 200)}`);

  const parsed = JSON.parse(match[0]);

  // FIX 2: coerce campos numéricos — Gemini às vezes retorna "14.99" em vez de 14.99
  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const extracted: DraftQuote = {
    unitPrice:    toNum(parsed.extracted?.unitPrice),
    minQuantity:  toNum(parsed.extracted?.minQuantity),
    leadTimeDays: toNum(parsed.extracted?.leadTimeDays),
    validityDays: toNum(parsed.extracted?.validityDays),
  };

  return {
    extracted,
    isMultiField: Boolean(parsed.isMultiField),
    isCanceled:   Boolean(parsed.isCanceled),
    replyMessage: String(parsed.replyMessage ?? ""),
  };
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

  const dias: [string, number][] = [
    ["segunda / segunda-feira", diasParaDiaSemana(1)],
    ["terça / terça-feira",     diasParaDiaSemana(2)],
    ["quarta / quarta-feira",   diasParaDiaSemana(3)],
    ["quinta / quinta-feira",   diasParaDiaSemana(4)],
    ["sexta / sexta-feira",     diasParaDiaSemana(5)],
    ["sábado",                  diasParaDiaSemana(6)],
    ["domingo",                 diasParaDiaSemana(0)],
  ];

  return `Hoje: ${hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
Tabela de conversão de prazos (calcule sempre, nunca peça ao fornecedor que converta):
  hoje / imediato / pronta entrega = 0
  amanhã (${fmt(amanha)}) = 1
  depois de amanhã = 2
  essa semana = ${diasParaDiaSemana(6)}
  semana que vem = ${diasParaDiaSemana(1) + 7}
${dias.map(([k, v]) => `  ${k} que vem = ${v} dias`).join("\n")}
  Data absoluta como "30/05" ou "05/06": calcule os dias corridos entre hoje (${fmt(hoje)}) e essa data.`;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────
// FIX 3: sem type hints no JSON schema — usa exemplos concretos (0, 1, null)
// para evitar que o Gemini retorne a string "number | null" como valor

function buildPrompt(
  productContext: string,
  draft: DraftQuote,
  activeField: ActiveField,
  text: string
): string {
  const fieldDesc: Record<NonNullable<ActiveField>, string> = {
    unitPrice:    "preco_unitario em R$ por unidade (decimal, ex: 14.99)",
    minQuantity:  "quantidade_minima de pedido (inteiro, ex: 10; sem minimo = 1)",
    leadTimeDays: "prazo_entrega em DIAS CORRIDOS a partir de hoje (inteiro, ex: 3)",
    validityDays: "validade_cotacao em DIAS a partir de hoje (inteiro, ex: 7)",
  };

  const campoAtivo = activeField
    ? `CAMPO SENDO COLETADO AGORA: "${activeField}" — ${fieldDesc[activeField]}`
    : "Todos os campos já coletados.";

  const statusDraft = FIELD_ORDER
    .map(f => `  ${f}: ${draft[f] !== null ? draft[f] : "NULL (ainda falta)"}`)
    .join("\n");

  // Texto do fornecedor sanitizado para não quebrar o prompt
  const textSanitized = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `Você é Lia, assistente de compras da Supply IA no Telegram.

${buildDateContext()}

Produto solicitado: ${productContext}

Estado atual do rascunho (nao repita o que ja esta preenchido):
${statusDraft}

${campoAtivo}

Mensagem recebida do fornecedor: "${textSanitized}"

INSTRUCOES:
1. Interprete a mensagem e extraia o valor para o campo ativo.
   Como voce sabe qual campo esta sendo coletado, qualquer valor ambiguo (data, numero)
   pertence a esse campo especifico.
2. Se a mensagem tiver varios dados de uma vez, extraia todos que conseguir (isMultiField = true).
3. Para campos nao mencionados na mensagem, copie o valor do rascunho atual (pode ser null).
4. Nao repita perguntas sobre campos que ja tem valor no rascunho.
5. Se o fornecedor nao tiver o produto ou disser que nao pode fornecer: isCanceled = true.
6. Responda de forma natural e amigavel. Varie as confirmacoes. Maximo 1-2 frases curtas.
   NAO inclua a proxima pergunta no replyMessage — o sistema faz isso automaticamente.

Conversoes importantes para o campo ativo:
- Se activeField = "leadTimeDays" ou "validityDays": qualquer data ou expressao temporal
  deve ser convertida para numero de dias usando a tabela acima.
- Se activeField = "unitPrice": converta virgula para ponto decimal. Caixa com N unidades = preco/N.
- Se activeField = "minQuantity": "sem minimo", "nao tem", "qualquer" = 1.

RETORNE SOMENTE o JSON abaixo, sem nenhum texto antes ou depois, sem markdown:
{
  "extracted": {
    "unitPrice": 14.99,
    "minQuantity": 1,
    "leadTimeDays": 3,
    "validityDays": 7
  },
  "isMultiField": false,
  "isCanceled": false,
  "replyMessage": "Ok, anotado!"
}

Use null para campos nao extraidos. Use numeros reais (nao strings).`.trim();
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const webhookController = {
  async handle(req: Request, res: Response) {
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret)
      return res.status(401).send("Unauthorized");

    const { message } = req.body;

    // Sem texto (áudio, foto, sticker)
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
      // Onboarding via link de convite
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

      // Identifica o fornecedor pelo chatId
      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(
          chatId,
          "⚠️ Cadastro não encontrado. Acesse o link de convite enviado pelo gestor."
        );
        return res.status(200).send("OK");
      }

      // Verifica se há RFQ aberta para esse fornecedor
      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(
          chatId,
          "Olá! No momento não há cotações abertas para você. Avisamos quando precisar. 😊"
        );
        return res.status(200).send("OK");
      }

      // Contexto do produto
      const product = await productModel.findById(supplier.ownerId, rfq.productId);
      const productContext = product
        ? `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`
        : "Produto não identificado";

      // Rascunho + campo ativo persistidos no Firestore entre mensagens
      const draft: DraftQuote = supplier.draftQuote ?? {
        unitPrice: null, minQuantity: null, leadTimeDays: null, validityDays: null,
      };
      const activeField: ActiveField = supplier.activeField ?? proximaField(draft);

      // Chama o Gemini
      const geminiResponse = await ai.models.generateContent({
        model:    "gemini-2.5-flash-lite",
        contents: buildPrompt(productContext, draft, activeField, text),
      });

      // FIX 1+2+3: parse seguro com extração de bloco JSON e coerção numérica
      const aiResponse = parseGeminiJson(geminiResponse.text ?? "");

      // Cancelamento (sem estoque, não atende, etc)
      if (aiResponse.isCanceled) {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null,
          activeField: null,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // Mescla rascunho — ?? garante que 0 (pronta entrega) não é sobrescrito por null
      const updatedDraft: DraftQuote = {
        unitPrice:    aiResponse.extracted.unitPrice    ?? draft.unitPrice,
        minQuantity:  aiResponse.extracted.minQuantity  ?? draft.minQuantity,
        leadTimeDays: aiResponse.extracted.leadTimeDays ?? draft.leadTimeDays,
        validityDays: aiResponse.extracted.validityDays ?? draft.validityDays,
      };

      const nextField = proximaField(updatedDraft);
      const isComplete = nextField === null;

      if (isComplete) {
        // Persiste a cotação no banco
        await processarResposta(
          rfq.id,
          supplier.id,
          `Cotação via Lia: ${JSON.stringify(updatedDraft)}`,
          supplier.ownerId,
          {
            unitPrice:    updatedDraft.unitPrice,
            minQuantity:  updatedDraft.minQuantity,
            leadTimeDays: updatedDraft.leadTimeDays,
            validityDays: updatedDraft.validityDays,
          }
        );
        // Limpa rascunho
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null,
          activeField: null,
        });
        // Confirmação final
        const finalMsg = aiResponse.replyMessage?.trim()
          ? `${aiResponse.replyMessage}\n\n✅ Proposta registrada com sucesso! Muito obrigado. 😊`
          : "✅ Proposta registrada com sucesso! Muito obrigado. 😊";
        await telegramService.sendMessage(chatId, finalMsg);

      } else {
        // Salva rascunho atualizado e próximo campo ativo
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote:  updatedDraft,
          activeField: nextField,
        });
        // Confirmação da IA + próxima pergunta (gerada pelo sistema, não pelo Gemini)
        const pergunta = getPergunta(nextField);
        const reply = aiResponse.replyMessage?.trim()
          ? `${aiResponse.replyMessage} ${pergunta}`
          : pergunta;
        await telegramService.sendMessage(chatId, reply);
      }

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService
        .sendMessage(chatId, "⚠️ Deu um probleminha aqui. Pode repetir sua última mensagem?")
        .catch(() => {});
    }

    return res.status(200).send("OK");
  },
};
