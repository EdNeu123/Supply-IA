import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

export const iaService = {
  async estruturarCotacao(textoFornecedor: string) {
    try {
      // Pega a data de hoje para a IA conseguir calcular datas relativas
      const hoje = new Date();
      const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const infoHoje = `Hoje é ${diasSemana[hoje.getDay()]}, dia ${hoje.toLocaleDateString('pt-BR')}.`;

      const prompt = `Você extrai dados de uma cotação enviada por um fornecedor em texto livre (pt-BR).
Seu objetivo é extrair 4 dados e 1 observação (se houver).

INFORMAÇÕES DE CONTEXTO:
- ${infoHoje}
- Se o fornecedor usar datas relativas (ex: "quinta que vem", "amanhã", "daqui a 15 dias"), faça a conta a partir de hoje e retorne o número de dias inteiros.
- Se o fornecedor disser que "não tem quantia mínima", retorne 0 no campo quantidade_minima.

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
          responseMimeType: "application/json"
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