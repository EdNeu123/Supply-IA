import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { quoteModel } from '../models/quoteModel';
import { rfqModel } from '../models/rfqModel';
import { iaService } from '../services/iaService';

interface ParsedData {
  unitPrice: number | null;
  minQuantity: number | null;
  leadTimeDays: number | null;
  validityDays: number | null;
}

const processarResposta = async (
  rfqId: string, 
  supplierId: string, 
  rawReply: string, 
  ownerId: string, 
  parsedData?: ParsedData
) => {
  const rfq = await rfqModel.findById(rfqId);
  if (!rfq) throw Object.assign(new Error('RFQ não encontrada'), { status: 404 });

  // 1. Define de onde vêm os dados (Webhook com passos limpos OU fluxo antigo de Simulação)
  const dados = parsedData || await iaService.estruturarCotacao(rawReply);
  
  // 2. Prepara o pacote completo para salvar tudo num único movimento seguro
  const quoteData = {
    ownerId,
    rfqId,
    productId: rfq.productId,
    supplierId,
    rawReply,
    status: 'answered',
    unitPrice: dados ? (dados.unitPrice ?? (dados as any).preco_unitario ?? null) : null,
    leadTimeDays: dados ? (dados.leadTimeDays ?? (dados as any).prazo_entrega_dias ?? null) : null,
    minQty: dados ? (dados.minQuantity ?? (dados as any).quantidade_minima ?? null) : null,
    validityDays: dados ? (dados.validityDays ?? (dados as any).validade_dias ?? null) : null,
  };

  // 3. Salva no banco de dados de uma vez só! 
  // Isso impede que um update acidental apague o ownerId e deixe a cotação invisível pro front.
  const quote = await quoteModel.create(quoteData);

  return quote;
};

export const quoteController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await quoteModel.findByOwner(req.user!.uid));
  },
  async simulate(req: AuthRequest, res: Response) {
    const { rfqId, supplierId, rawReply } = req.body;
    const quote = await processarResposta(rfqId, supplierId, rawReply, req.user!.uid);
    res.status(201).json({ message: 'Simulação concluída com sucesso', quoteId: quote.id });
  },
};

export { processarResposta };