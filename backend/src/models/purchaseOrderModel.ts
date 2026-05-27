import { db } from '../config/firebaseAdmin';

const col = db.collection('purchaseOrders');

export const purchaseOrderModel = {
  async create(data: any) {
    const ref = col.doc();
    const doc = { ...data, id: ref.id, status: 'created', createdAt: new Date().toISOString() };
    await ref.set(doc); return doc;
  },
  async findByOwner(ownerId: string) {
    const snap = await col.where('ownerId', '==', ownerId).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => d.data());
  },
  async updateStatus(id: string, status: string) {
    await col.doc(id).update({ status });
  },
};
