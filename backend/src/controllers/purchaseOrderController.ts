import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { purchaseOrderModel } from '../models/purchaseOrderModel';

export const purchaseOrderController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await purchaseOrderModel.findByOwner(req.user!.uid));
  },
  async create(req: AuthRequest, res: Response) {
    const order = await purchaseOrderModel.create({ ...req.body, ownerId: req.user!.uid });
    res.status(201).json(order);
  },
  async updateStatus(req: AuthRequest, res: Response) {
    await purchaseOrderModel.updateStatus(req.params.id, req.body.status);
    res.json({ message: 'Status atualizado' });
  },
};
