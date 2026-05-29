import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

// Usando o SDK novo para manter o padrão com o webhook
const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

export const iaService = {
  async estruturarCotacao(textoFornecedor: string) {
    try {
      const prompt = `Você extrai dados de uma cotação enviada por um fornecedor em texto livre (pt-BR).
Seu objetivo é extrair 4 dados e 1 observação (se houver).
Responda APENAS com JSON válido neste exato formato:
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
        config: {
          responseMimeType: "application/json" // Garante o retorno em JSON limpo
        }
      });

      const text = response.text?.trim() || "{}";
      return JSON.parse(text);

    } catch (error) {
      console.error('Erro no parse do Gemini:', error);
      return null;
    }
  },
};