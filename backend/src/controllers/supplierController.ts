import crypto from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { supplierModel } from '../models/supplierModel';
import { env } from '../config/env';

export const supplierController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await supplierModel.findByOwner(req.user!.uid));
  },
  async create(req: AuthRequest, res: Response) {
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const data = { ...req.body, ownerId: req.user!.uid, reliabilityScore: 100,
      status: 'pending', telegramChatId: null, inviteToken };
    const supplier = await supplierModel.create(data);
    res.status(201).json({
      ...supplier,
      inviteLink: `https://t.me/${env.telegram.botUsername}?start=${inviteToken}`,
    });
  },
  async update(req: AuthRequest, res: Response) {
    res.json(await supplierModel.update(req.user!.uid, req.params.id, req.body));
  },
  async delete(req: AuthRequest, res: Response) {
    await supplierModel.delete(req.user!.uid, req.params.id);
    res.json({ message: 'Fornecedor excluído com sucesso' });
  },
};
