import { db } from '../config/firebaseAdmin';

const col = db.collection('suppliers');

export const supplierModel = {
  async create(data: any) {
    const ref = col.doc();
    const doc = { ...data, id: ref.id, createdAt: new Date().toISOString() };
    await ref.set(doc); return doc;
  },
  async findByOwner(ownerId: string) {
    const snap = await col.where('ownerId', '==', ownerId).get();
    return snap.docs.map(d => d.data());
  },
  async findById(ownerId: string, id: string) {
    const doc = await col.doc(id).get();
    const data = doc.data();
    return data?.ownerId === ownerId ? data : null;
  },
  async update(ownerId: string, id: string, data: any) {
    const ref = col.doc(id); const doc = await ref.get();
    if (!doc.exists || doc.data()?.ownerId !== ownerId)
      throw new Error('Fornecedor não encontrado ou sem permissão');
    await ref.update(data); return { id, ...data };
  },
  async delete(ownerId: string, id: string) {
    const ref = col.doc(id); const doc = await ref.get();
    if (!doc.exists || doc.data()?.ownerId !== ownerId)
      throw new Error('Fornecedor não encontrado ou sem permissão');
    await ref.delete(); return { id };
  },
  async updateTelegramChatId(id: string, telegramChatId: string) {
    await col.doc(id).update({ telegramChatId });
  },
  async findByTelegramChatId(telegramChatId: string) {
    const snap = await col.where('telegramChatId', '==', telegramChatId).limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
  },
  async findByInviteToken(inviteToken: string) {
    const snap = await col.where('inviteToken', '==', inviteToken).limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
  },
};
