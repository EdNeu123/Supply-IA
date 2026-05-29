import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.gemini.apiKey);

export const iaService = {
  async estruturarCotacao(textoFornecedor: string) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim()
        .replace(/^```json\n/, '').replace(/\n```$/, '');
      return JSON.parse(text);
    } catch (error) {
      console.error('Erro no parse do Gemini:', error);
      return null;
    }
  },
};
