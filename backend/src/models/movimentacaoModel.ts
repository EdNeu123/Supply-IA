import { db } from '../config/firebaseAdmin';

const col = db.collection('movimentacoes');

export const movimentacaoModel = {
  async create(data: any) {
    const ref = col.doc();
    const doc = { ...data, id: ref.id, createdAt: new Date().toISOString() };
    await ref.set(doc);
    return doc;
  },
  async findByOwner(ownerId: string) {
    const snap = await col
      .where('ownerId', '==', ownerId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snap.docs.map(d => d.data());
  },
  async findByProduct(ownerId: string, productId: string) {
    const snap = await col
      .where('ownerId', '==', ownerId)
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => d.data());
  },
};
