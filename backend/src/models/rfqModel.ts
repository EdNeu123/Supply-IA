import { db } from '../config/firebaseAdmin';

const col = db.collection('rfqs');

export const rfqModel = {
  async create(data: any) {
    const ref = col.doc();
    const doc = { ...data, id: ref.id, status: 'sent', createdAt: new Date().toISOString() };
    await ref.set(doc); return doc;
  },
  async findById(id: string) {
    const doc = await col.doc(id).get();
    return doc.exists ? doc.data() : null;
  },
  async findByOwner(ownerId: string) {
    const snap = await col.where('ownerId', '==', ownerId).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => d.data());
  },
  async findOpenBySupplier(supplierId: string) {
    const snap = await col
      .where('supplierIds', 'array-contains', supplierId)
      .where('status', 'in', ['sent', 'partial'])
      .orderBy('createdAt', 'desc')
      .limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
  },
};
