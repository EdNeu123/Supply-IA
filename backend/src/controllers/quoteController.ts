import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { rfqModel } from '../models/rfqModel';
import { quoteModel } from '../models/quoteModel';
import { iaService } from '../services/iaService';

const processarResposta = async (rfqId: string, supplierId: string, rawReply: string, ownerId: string) => {
  const rfq = await rfqModel.findById(rfqId);
  if (!rfq) throw Object.assign(new Error('RFQ não encontrada'), { status: 404 });

  const quote = await quoteModel.create({ ownerId, rfqId, productId: rfq.productId, supplierId, rawReply, status: 'answered' });
  const dados = await iaService.estruturarCotacao(rawReply);
  if (dados) await quoteModel.update(quote.id, {
    unitPrice: dados.preco_unitario ?? null,
    leadTimeDays: dados.prazo_entrega_dias ?? null,
    minQty: dados.quantidade_minima ?? null,
    validityDays: dados.validade_dias ?? null,
  });
  return quote;
};

export const quoteController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await quoteModel.findByOwner(req.user!.uid));
  },
  async simulate(req: AuthRequest, res: Response) {
    const { rfqId, supplierId, rawReply } = req.body;
    const quote = await processarResposta(rfqId, supplierId, rawReply, req.user!.uid);
    res.status(201).json({ message: 'Simulação concluída', quoteId: quote.id });
  },
};

export { processarResposta };
