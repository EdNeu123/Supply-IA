import { db } from '../src/config/firebaseAdmin';

const seed = async () => {
  const ownerId = process.argv[2];
  if (!ownerId) {
    console.error('❌ Uso: npm run seed <SEU_UID_FIREBASE>');
    process.exit(1);
  }

  try {
    console.log(`🌱 Seed para ownerId: ${ownerId}`);

    const productRef = db.collection('products').doc();
    const product = {
      id: productRef.id, ownerId,
      name: 'Café em Grão Gourmet 1kg', sku: 'CF-GR-001',
      currentStock: 12, avgDailyConsumption: 2, leadTimeDays: 3, safetyStockDays: 2,
      reorderPoint: 10, status: 'ok', createdAt: new Date().toISOString(),
    };
    await productRef.set(product);
    console.log('✅ Produto:', product.name);

    for (const sup of [
      { name: 'Distribuidora Alpha', email: 'vendas@alpha.com.br', reliabilityScore: 95, status: 'active', inviteToken: 'seed-token-1', telegramChatId: '1111111' },
      { name: 'Cafés do Brasil Atacado', email: 'contato@cafesbr.com.br', reliabilityScore: 88, status: 'active', inviteToken: 'seed-token-2', telegramChatId: '2222222' },
    ]) {
      const ref = db.collection('suppliers').doc();
      await ref.set({ ...sup, id: ref.id, ownerId, whatsapp: '', productIds: [product.id], createdAt: new Date().toISOString() });
      console.log('✅ Fornecedor:', sup.name);
    }

    console.log('🎉 Seed concluído!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
};

seed();
