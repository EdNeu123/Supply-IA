import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { rfqService } from '@/services/apiServices';
import { Semaforo } from '@/components/ui/Semaforo';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, ShoppingCart, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/models/types';

const emptyForm = (): Partial<Product> => ({
  name: '', sku: '', currentStock: 0,
  avgDailyConsumption: 0, leadTimeDays: 0, safetyStockDays: 0,
});

const fieldConfig = [
  { label: 'Nome do Produto',             key: 'name',                type: 'text',   colSpan: 2, help: 'Ex: Café em Grão 1kg' },
  { label: 'Código (SKU)',                key: 'sku',                 type: 'text',   colSpan: 1, help: 'Ex: CF-001' },
  { label: 'Estoque Atual (unidades)',    key: 'currentStock',        type: 'number', colSpan: 1, help: 'Quantas unidades você tem hoje' },
  { label: 'Quanto vende por dia (un.)', key: 'avgDailyConsumption', type: 'number', colSpan: 1, help: 'Média de unidades vendidas/consumidas por dia' },
  { label: 'Prazo do fornecedor (dias)', key: 'leadTimeDays',        type: 'number', colSpan: 1, help: 'Em quantos dias o fornecedor entrega após o pedido' },
  { label: 'Dias de reserva de segurança', key: 'safetyStockDays',  type: 'number', colSpan: 2, help: 'Quantos dias extras de estoque você quer ter de segurança (ex: 3)' },
];

export const Produtos = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm());
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      editId ? productService.update(editId, data) : productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produto ${editId ? 'atualizado' : 'criado'}!`);
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto excluído!'); },
  });

  const rfqMutation = useMutation({
    mutationFn: rfqService.trigger,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      toast.success('Cotação disparada para os fornecedores!');
      setRfqModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Erro ao disparar cotação.');
    },
  });

  const openModal = (p?: Product) => {
    setEditId(p?.id ?? null);
    setForm(p ? { ...p } : emptyForm());
    setIsOpen(true);
  };

  const handleSimularVenda = async (p: Product) => {
    const novoEstoque = p.currentStock - 1;
    if (novoEstoque < 0) return toast.error('Estoque zerado!');
    await saveMutation.mutateAsync({ ...p, currentStock: novoEstoque });
    if (novoEstoque <= p.reorderPoint && p.currentStock > p.reorderPoint) {
      toast.warning(`⚠️ Ponto de pedido atingido para ${p.name}!`);
      const ativos = suppliers.filter(s => s.status === 'active');
      if (ativos.length) {
        rfqMutation.mutate({ productId: p.id, supplierIds: ativos.map(s => s.id) });
      } else {
        toast.error('Nenhum fornecedor ativo para receber cotação.');
      }
    } else {
      toast.success('Venda simulada!');
    }
  };

  const handleDispararCotacao = (p: Product) => {
    const ativos = suppliers.filter(s => s.status === 'active');
    if (!ativos.length) return toast.error('Nenhum fornecedor ativo. Cadastre e ative fornecedores primeiro.');
    setSelectedProduct(p);
    setRfqModalOpen(true);
  };

  const confirmarCotacao = () => {
    if (!selectedProduct) return;
    const ativos = suppliers.filter(s => s.status === 'active');
    rfqMutation.mutate({ productId: selectedProduct.id, supplierIds: ativos.map(s => s.id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-1">Gestão de Produtos</h2>
        <button onClick={() => openModal()} className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-colors">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Nome (SKU)</th>
              <th className="px-6 py-4 font-medium">Estoque</th>
              <th className="px-6 py-4 font-medium">Ponto de Pedido</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? <tr><td colSpan={5} className="text-center py-8 text-text-2">Carregando...</td></tr>
              : products.length === 0
              ? <tr><td colSpan={5} className="text-center py-8 text-text-2">Nenhum produto cadastrado.</td></tr>
              : products.map(p => (
                <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-text-1">{p.name}</p>
                    <p className="text-xs text-text-3">{p.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-text-2">{p.currentStock} un</td>
                  <td className="px-6 py-4 text-text-2">{p.reorderPoint} un</td>
                  <td className="px-6 py-4"><Semaforo status={p.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      {/* Disparar cotação manual */}
                      <button
                        onClick={() => handleDispararCotacao(p)}
                        title="Disparar Cotação"
                        className="p-2 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors"
                      >
                        <Send size={16} />
                      </button>
                      {/* Simular venda */}
                      <button
                        onClick={() => handleSimularVenda(p)}
                        title="Simular Venda (-1 unidade)"
                        className="p-2 text-text-2 hover:text-green rounded-lg hover:bg-green-bg transition-colors"
                      >
                        <ShoppingCart size={16} />
                      </button>
                      <button onClick={() => openModal(p)} className="p-2 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)} className="p-2 text-text-2 hover:text-danger rounded-lg hover:bg-red-bg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal Novo/Editar Produto */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fieldConfig.map(({ label, key, type, colSpan, help }) => (
              <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-text-1 mb-1">{label}</label>
                <input
                  type={type}
                  required
                  placeholder={help}
                  value={(form as any)[key] ?? ''}
                  onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none placeholder:text-text-3 placeholder:text-xs"
                />
                <p className="text-xs text-text-3 mt-1">{help}</p>
              </div>
            ))}
          </div>

          {/* Preview do ponto de pedido */}
          {form.avgDailyConsumption && form.leadTimeDays !== undefined && form.safetyStockDays !== undefined && (
            <div className="p-3 bg-accent-bg rounded-xl text-sm text-accent">
              📦 Ponto de pedido calculado:{' '}
              <strong>
                {(Number(form.avgDailyConsumption) * Number(form.leadTimeDays)) +
                  (Number(form.avgDailyConsumption) * Number(form.safetyStockDays))} unidades
              </strong>
              {' '}— o sistema vai alertar quando chegar nesse nível.
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Cotação Manual */}
      <Modal isOpen={rfqModalOpen} onClose={() => setRfqModalOpen(false)} title="Disparar Cotação">
        <div className="space-y-4">
          <p className="text-text-2 text-sm">
            Você está prestes a disparar uma cotação para{' '}
            <strong className="text-text-1">"{selectedProduct?.name}"</strong>{' '}
            para todos os fornecedores ativos via Telegram.
          </p>
          <div className="p-3 bg-surface-2 rounded-xl text-sm text-text-2">
            <p className="font-medium text-text-1 mb-1">Fornecedores que receberão a cotação:</p>
            {suppliers.filter(s => s.status === 'active').map(s => (
              <p key={s.id} className="text-accent">• {s.name}</p>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setRfqModalOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl font-medium transition-colors">Cancelar</button>
            <button
              onClick={confirmarCotacao}
              disabled={rfqMutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              {rfqMutation.isPending ? 'Disparando...' : 'Confirmar e Disparar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
