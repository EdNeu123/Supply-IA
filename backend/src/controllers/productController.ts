import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { productModel } from '../models/productModel';
import { pontoPedidoService } from '../services/pontoPedidoService';

const calcularEClassificar = (data: any) => {
  data.reorderPoint = pontoPedidoService.calcularPontoPedido(
    Number(data.avgDailyConsumption), Number(data.leadTimeDays), Number(data.safetyStockDays)
  );
  data.status = pontoPedidoService.classificarStatus(Number(data.currentStock), data.reorderPoint);
  return data;
};

export const productController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await productModel.findByOwner(req.user!.uid));
  },
  async create(req: AuthRequest, res: Response) {
    const data = calcularEClassificar({ ...req.body, ownerId: req.user!.uid });
    res.status(201).json(await productModel.create(data));
  },
  async update(req: AuthRequest, res: Response) {
    const existing = await productModel.findById(req.user!.uid, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
    const data = calcularEClassificar({ ...existing, ...req.body });
    res.json(await productModel.update(req.user!.uid, req.params.id, data));
  },
  async delete(req: AuthRequest, res: Response) {
    await productModel.delete(req.user!.uid, req.params.id);
    res.json({ message: 'Produto excluído com sucesso' });
  },
};
