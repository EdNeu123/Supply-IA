import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

// Usando a nova SDK @google/genai
const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

export const iaService = {
  async estruturarCotacao(textoFornecedor: string) {
    try {
      const prompt = `Você extrai dados de uma cotação enviada por um fornecedor em texto livre (pt-BR).
Responda APENAS com JSON válido, sem markdown, neste formato:
{
  "preco_unitario": number | null,
  "prazo_entrega_dias": number | null,
  "quantidade_minima": number | null,
  "validade_dias": number | null,
  "observacao": string | null
}
Se um campo não estiver no texto, use null. Não invente valores.
Texto do fornecedor: """${textoFornecedor}"""`;

      // Atualizado para a nova sintaxe e modelo v2.5
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
      });

      const rawText = (response.text || '')
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
      return JSON.parse(rawText);
    } catch (error) {
      console.error('Erro no parse do Gemini:', error);
      return null;
    }
  },
};