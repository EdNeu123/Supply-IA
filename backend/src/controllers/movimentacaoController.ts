import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { movimentacaoModel } from '../models/movimentacaoModel';
import { productModel } from '../models/productModel';
import { pontoPedidoService } from '../services/pontoPedidoService';

export const movimentacaoController = {
  async list(req: AuthRequest, res: Response) {
    const movs = await movimentacaoModel.findByOwner(req.user!.uid);
    res.json(movs);
  },

  async create(req: AuthRequest, res: Response) {
    const ownerId = req.user!.uid;
    const { productId, tipo, quantidade, motivo } = req.body;

    if (!productId || !tipo || !quantidade)
      return res.status(400).json({ error: 'productId, tipo e quantidade são obrigatórios.' });
    if (!['entrada', 'saida'].includes(tipo))
      return res.status(400).json({ error: 'tipo deve ser "entrada" ou "saida".' });
    if (Number(quantidade) <= 0)
      return res.status(400).json({ error: 'quantidade deve ser maior que zero.' });

    // Busca produto
    const product = await productModel.findById(ownerId, productId);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

    // Calcula novo estoque
    const delta = tipo === 'entrada' ? Number(quantidade) : -Number(quantidade);
    const newStock = Number(product.currentStock) + delta;
    if (newStock < 0)
      return res.status(400).json({ error: `Estoque insuficiente. Atual: ${product.currentStock} un.` });

    // Salva a movimentação
    const mov = await movimentacaoModel.create({ ownerId, productId, tipo, quantidade: Number(quantidade), motivo: motivo ?? '', estoqueAntes: product.currentStock, estoqueDepois: newStock });

    // Recalcula consumo médio diário baseado nas saídas dos últimos 30 dias
    let updatedFields: any = { currentStock: newStock };

    if (tipo === 'saida') {
      const todasMovs = await movimentacaoModel.findByProduct(ownerId, productId);
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const saidasRecentes = todasMovs.filter(m => m.tipo === 'saida' && m.createdAt >= trintaDiasAtras);
      const totalSaidas = saidasRecentes.reduce((acc: number, m: any) => acc + m.quantidade, 0);

      // Dias distintos com saída (mínimo 1 para evitar divisão por zero)
      const diasComMovimento = new Set(saidasRecentes.map((m: any) => m.createdAt.slice(0, 10))).size || 1;
      const novoConsumo = Math.max(1, Math.round((totalSaidas / diasComMovimento) * 10) / 10);

      // Recalcula ponto de pedido
      const novoPP = pontoPedidoService.calcularPontoPedido(novoConsumo, product.leadTimeDays, product.safetyStockDays);
      const novoStatus = pontoPedidoService.classificarStatus(newStock, novoPP);

      updatedFields = {
        ...updatedFields,
        avgDailyConsumption: novoConsumo,
        reorderPoint: novoPP,
        status: novoStatus,
        ppAtualizado: novoPP !== product.reorderPoint,
      };
    } else {
      // Entrada: recalcula só status
      const novoStatus = pontoPedidoService.classificarStatus(newStock, product.reorderPoint);
      updatedFields.status = novoStatus;
    }

    await productModel.update(ownerId, productId, updatedFields);

    res.status(201).json({
      movimentacao: mov,
      produto: { ...product, ...updatedFields },
      ppMudou: updatedFields.ppAtualizado ?? false,
    });
  },
};
