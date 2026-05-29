import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

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
- Expressões como "comprar 1 caixa com 15" significam que a quantidade mínima ofertada foi 15. Extraia o número real de unidades.

REGRA DE DATAS (MUITO IMPORTANTE):
- O fornecedor frequentemente usa datas relativas (ex: "terça que vem", "amanhã", "daqui a 5 dias").
- Você DEVE calcular a diferença exata de dias a partir de HOJE e transformar em um número inteiro.
- Para evitar erros, faça a conta explicitamente no campo "raciocinio_datas" antes de preencher os números.

Responda APENAS com JSON válido, sem formatação markdown, neste exato formato:
{
  "raciocinio_datas": "Explique aqui sua conta de dias a partir de hoje (ex: Hoje é sexta, terça que vem são +4 dias)",
  "preco_unitario": number | null,
  "prazo_entrega_dias": number | null,
  "quantidade_minima": number | null,
  "validade_dias": number | null,
  "observacao": string | null
}
Se um campo não estiver no texto, use null. Não invente valores que não existam.

Texto do fornecedor: """${textoFornecedor}"""`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const rawText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(rawText);

    } catch (error) {
      console.error('Erro no parse do Gemini no Plano B:', error);
      return null;
    }
  },
};