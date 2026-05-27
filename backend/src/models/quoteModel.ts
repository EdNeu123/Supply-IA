import { db } from '../config/firebaseAdmin';

const col = db.collection('quotes');

export const quoteModel = {
  async create(data: any) {
    const ref = col.doc();
    const doc = { ...data, id: ref.id, createdAt: new Date().toISOString() };
    await ref.set(doc); return doc;
  },
  async findByRfq(ownerId: string, rfqId: string) {
    const snap = await col.where('ownerId', '==', ownerId).where('rfqId', '==', rfqId).get();
    return snap.docs.map(d => d.data());
  },
  async findByOwner(ownerId: string) {
    const snap = await col.where('ownerId', '==', ownerId).get();
    return snap.docs.map(d => d.data());
  },
  async update(id: string, data: any) {
    await col.doc(id).update(data);
  },
};
