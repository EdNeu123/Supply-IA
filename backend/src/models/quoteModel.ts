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
  // Busca quotes por lista de rfqIds — garante que quotes do webhook aparecem
  // mesmo que ownerId tenha divergência
  async findByRfqIds(rfqIds: string[]) {
    if (!rfqIds.length) return [];
    // Firestore suporta no máximo 30 valores no 'in'
    const chunks: string[][] = [];
    for (let i = 0; i < rfqIds.length; i += 30) chunks.push(rfqIds.slice(i, i + 30));
    const results: any[] = [];
    for (const chunk of chunks) {
      const snap = await col.where('rfqId', 'in', chunk).get();
      results.push(...snap.docs.map(d => d.data()));
    }
    return results;
  },
  async update(id: string, data: any) {
    await col.doc(id).update(data);
  },
};
