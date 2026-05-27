import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { rfqModel } from '../models/rfqModel';
import { supplierModel } from '../models/supplierModel';
import { productModel } from '../models/productModel';
import { telegramService } from '../services/telegramService';

export const rfqController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await rfqModel.findByOwner(req.user!.uid));
  },
  async triggerRfq(req: AuthRequest, res: Response) {
    const { productId, supplierIds } = req.body;
    const ownerId = req.user!.uid;

    const product = await productModel.findById(ownerId, productId);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const activeSuppliers = (await Promise.all(
      supplierIds.map((id: string) => supplierModel.findById(ownerId, id))
    )).filter((s): s is NonNullable<typeof s> => s?.status === 'active');

    if (!activeSuppliers.length)
      return res.status(400).json({ error: 'Nenhum fornecedor ativo para este produto' });

    const rfq = await rfqModel.create({ ownerId, productId, supplierIds: activeSuppliers.map(s => s.id) });
    await Promise.all(activeSuppliers.map(s => telegramService.enviarRFQ(s, product, rfq.id)));

    res.status(201).json(rfq);
  },
};
