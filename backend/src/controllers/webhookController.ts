import { GoogleGenAI } from "@google/genai";
import { Request, Response } from "express";
import { env } from "../config/env";
import { rfqModel } from "../models/rfqModel";
import { supplierModel } from "../models/supplierModel";
import { productModel } from "../models/productModel";
import { telegramService } from "../services/telegramService";
import { processarResposta } from "./quoteController";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ─── Helpers de data ────────────────────────────────────────────────────────

function calcularDiasParaDiaSemana(targetDay: number): number {
  const hoje = new Date().getDay();
  const diff = (targetDay - hoje + 7) % 7;
  return diff === 0 ? 7 : diff; // "terça que vem" = próxima terça, nunca hoje
}

function buildDateContext(): string {
  const hoje = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const dias: Record<string, number> = {
    "domingo":        calcularDiasParaDiaSemana(0),
    "segunda":        calcularDiasParaDiaSemana(1),
    "segunda-feira":  calcularDiasParaDiaSemana(1),
    "terça":          calcularDiasParaDiaSemana(2),
    "terca":          calcularDiasParaDiaSemana(2),
    "terça-feira":    calcularDiasParaDiaSemana(2),
    "quarta":         calcularDiasParaDiaSemana(3),
    "quarta-feira":   calcularDiasParaDiaSemana(3),
    "quinta":         calcularDiasParaDiaSemana(4),
    "quinta-feira":   calcularDiasParaDiaSemana(4),
    "sexta":          calcularDiasParaDiaSemana(5),
    "sexta-feira":    calcularDiasParaDiaSemana(5),
    "sábado":         calcularDiasParaDiaSemana(6),
    "sabado":         calcularDiasParaDiaSemana(6),
  };

  const diasSemana = Object.entries(dias)
    .map(([k, v]) => `  - "${k} que vem" ou "próxima ${k}" → ${v} dias`)
    .join("\n");

  const diaSemanaHoje = hoje.toLocaleDateString("pt-BR", { weekday: "long" });
  const semanaQueVemSeg = calcularDiasParaDiaSemana(1);
  const fimDeSemana = calcularDiasParaDiaSemana(6);

  return `Hoje é ${diaSemanaHoje}, ${fmt(hoje)}.
Referências de prazo:
  - "hoje" / "imediato" / "pronta entrega" / "agora" → 0
  - "amanhã" (${fmt(amanha)}) → 1
  - "depois de amanhã" → 2
  - "essa semana" / "até o final da semana" → ${fimDeSemana}
  - "semana que vem" / "próxima semana" → ${semanaQueVemSeg}
  - Dias da semana (próxima ocorrência):
${diasSemana}
  - Data absoluta (ex: "30/05", "05/06/2026"):
    Calcule a diferença em dias corridos entre hoje e a data. NUNCA peça ao fornecedor para converter — você calcula.
    Exemplo: se hoje é ${fmt(hoje)} e ele disser "${fmt(amanha)}", o prazo é 1 dia.`;
}

// ─── Build prompt ────────────────────────────────────────────────────────────

function buildPrompt(
  productContext: string,
  rascunho: Record<string, number | null>,
  text: string
): string {
  return `
Você é Lia, assistente virtual de compras da Supply IA. Conversa no Telegram com fornecedores para coletar dados de cotação de forma natural, eficiente e humanizada.

═══════════════════════════════════════════
CONTEXTO DA COTAÇÃO
═══════════════════════════════════════════
Produto: ${productContext}
${buildDateContext()}

Rascunho atual (o que já foi coletado):
${JSON.stringify(rascunho, null, 2)}

Nova mensagem do fornecedor: "${text}"

═══════════════════════════════════════════
CAMPOS QUE VOCÊ PRECISA COLETAR
═══════════════════════════════════════════
1. unitPrice      → Preço unitário em R$ (decimal). Se ele passar preço de caixa/fardo, calcule o unitário.
2. minQuantity    → Quantidade mínima (inteiro). "sem mínimo" / "qualquer quantidade" → 1.
3. leadTimeDays   → Prazo de entrega em DIAS CORRIDOS a partir de hoje (inteiro ≥ 0).
4. validityDays   → Validade da cotação em DIAS a partir de hoje (inteiro ≥ 1).

═══════════════════════════════════════════
REGRAS DE INTERPRETAÇÃO
═══════════════════════════════════════════

PRAZOS E DATAS
- Use a tabela de referências acima para converter qualquer expressão temporal em número de dias.
- NUNCA peça para o fornecedor dizer "em dias". Você converte.
- "terça que vem" = ${calcularDiasParaDiaSemana(2)} dias. "quinta que vem" = ${calcularDiasParaDiaSemana(4)} dias. Calcule baseado no dia de hoje.
- Datas absolutas: subtraia hoje da data informada. Se disser "30/05" e hoje é ${new Date().toLocaleDateString("pt-BR")}, calcule a diferença.

PREÇOS
- Aceite: 14,99 / R$14,99 / 14.99 / "quatorze e noventa e nove"
- Caixa ou fardo: "caixa com 10 por R$50" → unitPrice = 5.00 (faça a conta)
- Gírias: "um conto" = R$100, "cinquenta pilas" = R$50

QUANTIDADE MÍNIMA
- "sem mínimo" / "não tem" / "tanto faz" / "qualquer" → 1
- "caixa fechada de 12" → 12

MENSAGENS COM MÚLTIPLOS DADOS
Se o fornecedor mandar vários dados de uma vez (ex: "14,99, entrega quinta, sem mínimo, vale até 30/05"),
extraia TODOS de uma só vez. Só pergunte o que genuinamente ficou faltando.
NÃO repita perguntas sobre o que já foi dito na mesma mensagem.

═══════════════════════════════════════════
COMO CONDUZIR A CONVERSA
═══════════════════════════════════════════

ESTILO GERAL
- Natural, amigável, direta. Escreva como uma pessoa real no Telegram.
- Varie as confirmações: "Ótimo!", "Perfeito!", "Entendido!", "Combinado!", "Certo!", "Ok, anotado!"
- Evite repetir a mesma frase de abertura toda mensagem.
- Máximo 1-2 emojis por mensagem.
- Máximo 1 pergunta por mensagem. Nunca faça duas perguntas ao mesmo tempo.

SE O FORNECEDOR PERGUNTAR ALGO
Responda de forma curta e natural, depois emende com o que precisa:
- "Qual marca?" → "A marca do descritivo, ou similar de mesma qualidade. Pode confirmar o prazo de entrega?"
- "Como é o pagamento?" → "Padrão da empresa: boleto 30 dias. E o frete é CIF por conta de vocês. Voltando — [próxima pergunta]"
- "Onde fica o galpão?" → "Te passo o endereço depois pelo pessoal de logística! Me fala, [próxima pergunta]"
- "É urgente?" → "Sim, precisamos o quanto antes! Qual o prazo mínimo que você consegue?"
- Qualquer outra pergunta: responda curto e volte ao assunto.

PERGUNTAS PENDENTES (use linguagem variada)
- Faltando prazo: "Quando você consegue entregar?" / "Qual o prazo de entrega?" / "Em quanto tempo chega?"
- Faltando preço: "Qual o preço unitário?" / "Como fica o valor por unidade?"
- Faltando mínimo: "Tem pedido mínimo?" / "Qual a quantidade mínima?"
- Faltando validade: "Por quanto tempo esse preço é válido?" / "Até quando vale essa proposta?"

CANCELAMENTO
Se o fornecedor indicar que não tem o produto / sem estoque / não atende: isCanceled = true.
replyMessage = despedida natural. Ex: "Entendido, sem problemas! Obrigada mesmo assim. 👋"

SAUDAÇÕES E MENSAGENS INFORMAIS
Responda naturalmente e emende com o que precisa.
Ex: "Oi tudo bem?" → "Tudo ótimo, obrigada! 😊 Me conta, [próxima pergunta pendente]"

═══════════════════════════════════════════
RETORNO OBRIGATÓRIO
═══════════════════════════════════════════

Retorne SOMENTE um JSON válido, sem markdown, sem texto fora do JSON:

{
  "updatedDraft": {
    "unitPrice": number | null,
    "minQuantity": number | null,
    "leadTimeDays": number | null,
    "validityDays": number | null
  },
  "isComplete": boolean,
  "isCanceled": boolean,
  "replyMessage": "string"
}

Regras:
- updatedDraft: inclua TODOS os 4 campos, mesmo os já preenchidos anteriormente
- isComplete: true SOMENTE se todos os 4 campos ≠ null E isCanceled = false
- isCanceled: true se fornecedor não consegue fornecer
- Se isComplete = true, replyMessage DEVE SER exatamente: "✅ Proposta registrada com sucesso! Muito obrigado. 😊"
- replyMessage: máximo 2 frases curtas
`.trim();
}

// ─── Controller ──────────────────────────────────────────────────────────────

export const webhookController = {
  async handle(req: Request, res: Response) {
    // 1. Validação de segurança
    if (req.headers["x-telegram-bot-api-secret-token"] !== env.telegram.webhookSecret)
      return res.status(401).send("Unauthorized");

    const { message } = req.body;

    // 2. Mensagens sem texto (áudio, foto, sticker, etc)
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
    const text = message.text.trim();

    try {
      // 3. Onboarding (/start)
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
              "✅ Cadastro concluído! Você receberá cotações da nossa empresa por aqui. Qualquer dúvida, é só falar. 😊"
            );
          }
        }
        return res.status(200).send("OK");
      }

      // 4. Identificação do fornecedor
      const supplier = await supplierModel.findByTelegramChatId(chatId);
      if (!supplier) {
        await telegramService.sendMessage(
          chatId,
          "⚠️ Não encontrei seu cadastro. Acesse o link de convite enviado pelo gestor para se vincular."
        );
        return res.status(200).send("OK");
      }

      // 5. RFQ aberta
      const rfq = await rfqModel.findOpenBySupplier(supplier.id);
      if (!rfq) {
        await telegramService.sendMessage(
          chatId,
          "Olá! No momento não há cotações abertas para você. Assim que precisarmos, avisamos por aqui. 😊"
        );
        return res.status(200).send("OK");
      }

      // 6. Contexto do produto
      const product = await productModel.findById(supplier.ownerId, rfq.productId);
      const productContext = product
        ? `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`
        : "Produto não encontrado";

      // 7. Rascunho atual
      const rascunho: Record<string, number | null> = supplier.draftQuote ?? {
        unitPrice: null,
        minQuantity: null,
        leadTimeDays: null,
        validityDays: null,
      };

      // 8. Chamada do Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: buildPrompt(productContext, rascunho, text),
      });

      const rawText = (response.text ?? "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const aiResponse = JSON.parse(rawText);

      // 9. Cancelamento
      if (aiResponse.isCanceled) {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: null,
          chatHistory: "",
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // 10. Incompleto — salva rascunho e continua
      if (!aiResponse.isComplete) {
        await supplierModel.update(supplier.ownerId, supplier.id, {
          draftQuote: aiResponse.updatedDraft,
        });
        await telegramService.sendMessage(chatId, aiResponse.replyMessage);
        return res.status(200).send("OK");
      }

      // 11. Completo — salva cotação
      await processarResposta(
        rfq.id,
        supplier.id,
        "Cotação coletada via chat estruturado (Lia)",
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
        chatHistory: "",
      });
      await telegramService.sendMessage(chatId, aiResponse.replyMessage);

    } catch (error) {
      console.error("Erro no webhook:", error);
      await telegramService
        .sendMessage(
          chatId,
          "⚠️ Deu um probleminha aqui no sistema. Pode repetir sua última mensagem?"
        )
        .catch(() => {});
    }

    return res.status(200).send("OK");
  },
};