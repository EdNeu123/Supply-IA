import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { quoteModel } from '../models/quoteModel';
import { rfqModel } from '../models/rfqModel';
import { iaService } from '../services/iaService';

interface ParsedData {
  unitPrice:    number | null;
  minQuantity:  number | null;
  leadTimeDays: number | null;
  validityDays: number | null;
}

export const processarResposta = async (
  rfqId: string,
  supplierId: string,
  rawReply: string,
  ownerId: string,
  parsedData?: ParsedData
) => {
  const rfq = await rfqModel.findById(rfqId);
  if (!rfq) throw Object.assign(new Error('RFQ não encontrada'), { status: 404 });

  const quote = await quoteModel.create({
    ownerId,
    rfqId,
    productId: rfq.productId,
    supplierId,
    rawReply,
    status: 'answered',
  });

  const dados = parsedData || await iaService.estruturarCotacao(rawReply);

  if (dados) {
    await quoteModel.update(quote.id, {
      unitPrice:    dados.unitPrice    ?? (dados as any).preco_unitario     ?? null,
      leadTimeDays: dados.leadTimeDays ?? (dados as any).prazo_entrega_dias ?? null,
      minQty:       dados.minQuantity  ?? (dados as any).quantidade_minima  ?? null,
      validityDays: dados.validityDays ?? (dados as any).validade_dias      ?? null,
    });
  }

  // Atualiza status da RFQ para 'partial' ou 'answered'
  try {
    const todasQuotes = await quoteModel.findByRfq(ownerId, rfqId);
    const supplierIds: string[] = (rfq as any).supplierIds || [];
    const responderam = new Set(todasQuotes.map((q: any) => q.supplierId));
    const todos = supplierIds.length > 0 && supplierIds.every(id => responderam.has(id));
    await rfqModel.updateStatus(rfqId, todos ? 'answered' : 'partial');
  } catch (e) {
    console.error('Erro ao atualizar status da RFQ:', e);
  }

  return quote;
};

export const quoteController = {
  async list(req: AuthRequest, res: Response) {
    const ownerId = req.user!.uid;

    // Busca por ownerId direto (rota normal)
    const byOwner = await quoteModel.findByOwner(ownerId);

    // Busca também por rfqIds do owner — garante que quotes do webhook
    // aparecem mesmo se houver divergência de ownerId
    const rfqs = await rfqModel.findByOwner(ownerId);
    const rfqIds = rfqs.map((r: any) => r.id);
    const byRfq = await quoteModel.findByRfqIds(rfqIds);

    // Merge sem duplicatas (usa id como chave)
    const map = new Map<string, any>();
    for (const q of [...byOwner, ...byRfq]) map.set(q.id, q);

    res.json(Array.from(map.values()));
  },

  async simulate(req: AuthRequest, res: Response) {
    const { rfqId, supplierId, rawReply } = req.body;
    const quote = await processarResposta(rfqId, supplierId, rawReply, req.user!.uid);
    res.status(201).json({ message: 'Simulação concluída', quoteId: quote.id });
  },
};
