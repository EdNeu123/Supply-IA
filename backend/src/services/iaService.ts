import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

// Puxando a chave do mesmo jeito que funcionou no webhook para garantir
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || env.gemini.apiKey || "" });

export const iaService = {
  async estruturarCotacao(textoFornecedor: string) {
    try {
      const hoje = new Date();
      const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const infoHoje = `Hoje é ${diasSemana[hoje.getDay()]}, dia ${hoje.toLocaleDateString('pt-BR')}.`;

      const prompt = `Você extrai dados de uma cotação enviada por um fornecedor em texto livre (pt-BR).
Seu objetivo é extrair 4 dados e 1 observação (se houver).

INFORMAÇÕES DE CONTEXTO:
- ${infoHoje}
- Se o fornecedor usar datas relativas (ex: "quinta que vem", "amanhã", "daqui a 15 dias"), faça a conta a partir de hoje e retorne o número de dias inteiros.
- Se o fornecedor disser que "não tem quantia mínima", retorne 0 no campo quantidade_minima.

Responda APENAS com JSON válido, sem formatação markdown, neste exato formato:
{
  "preco_unitario": number | null,
  "prazo_entrega_dias": number | null,
  "quantidade_minima": number | null,
  "validade_dias": number | null,
  "observacao": string | null
}
Se um campo não estiver no texto, use null. Extraia os valores como números (prazos/validades em dias). Não invente valores.

Texto do fornecedor: """${textoFornecedor}"""`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      // A linha de ouro que limpou o erro lá no Webhook
      const rawText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(rawText);

    } catch (error) {
      console.error('Erro no parse do Gemini no Plano B:', error);
      return null;
    }
  },
};