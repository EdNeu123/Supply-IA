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

  // Cria a quote com status 'answered'
  const quote = await quoteModel.create({
    ownerId,
    rfqId,
    productId: rfq.productId,
    supplierId,
    rawReply,
    status: 'answered',
  });

  // Usa dados estruturados do webhook ou chama iaService para o fluxo de simulação
  const dados = parsedData || await iaService.estruturarCotacao(rawReply);

  if (dados) {
    await quoteModel.update(quote.id, {
      unitPrice:    dados.unitPrice    ?? (dados as any).preco_unitario    ?? null,
      leadTimeDays: dados.leadTimeDays ?? (dados as any).prazo_entrega_dias ?? null,
      minQty:       dados.minQuantity  ?? (dados as any).quantidade_minima  ?? null,
      validityDays: dados.validityDays ?? (dados as any).validade_dias      ?? null,
    });
  }

  // Atualiza status da RFQ:
  // Verifica quantos suppliers da RFQ já responderam
  // Se todos responderam -> 'answered', senão -> 'partial'
  try {
    const todasQuotes = await quoteModel.findByRfq(ownerId, rfqId);
    const supplierIds: string[] = rfq.supplierIds || [];
    const responderam = new Set(todasQuotes.map((q: any) => q.supplierId));
    const todos = supplierIds.every(id => responderam.has(id));
    await rfqModel.updateStatus(rfqId, todos ? 'answered' : 'partial');
  } catch (e) {
    // Não quebra o fluxo se a atualização de status falhar
    console.error('Erro ao atualizar status da RFQ:', e);
  }

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
