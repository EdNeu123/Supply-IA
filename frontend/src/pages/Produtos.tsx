import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { rfqService } from '@/services/apiServices';
import { Semaforo } from '@/components/ui/Semaforo';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/models/types';

const emptyForm = (): Partial<Product> => ({ name: '', sku: '', currentStock: 0, avgDailyConsumption: 0, leadTimeDays: 0, safetyStockDays: 0 });

export const Produtos = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm());

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) => editId ? productService.update(editId, data) : productService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success(`Produto ${editId ? 'atualizado' : 'criado'}!`); setIsOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto excluído!'); },
  });

  const rfqMutation = useMutation({ mutationFn: rfqService.trigger });

  const openModal = (p?: Product) => { setEditId(p?.id ?? null); setForm(p ? { ...p } : emptyForm()); setIsOpen(true); };

  const handleSimularVenda = async (p: Product) => {
    const novoEstoque = p.currentStock - 1;
    if (novoEstoque < 0) return toast.error('Estoque zerado!');
    await saveMutation.mutateAsync({ currentStock: novoEstoque });
    if (novoEstoque <= p.reorderPoint && p.currentStock > p.reorderPoint) {
      toast.warning(`Ponto de pedido atingido para ${p.name}!`);
      const ativos = suppliers.filter(s => s.status === 'active');
      if (ativos.length) rfqMutation.mutate({ productId: p.id, supplierIds: ativos.map(s => s.id) },
        { onSuccess: () => toast.success('Cotação automática disparada!') });
      else toast.error('Nenhum fornecedor ativo.');
    } else toast.success('Venda simulada!');
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
            <tr>{['Nome (SKU)', 'Estoque', 'Ponto de Pedido', 'Status', 'Ações'].map(h => (
              <th key={h} className={`px-6 py-4 font-medium ${h === 'Ações' ? 'text-right' : ''}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-text-2">Carregando...</td></tr>
              : products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-text-2">Nenhum produto cadastrado.</td></tr>
              : products.map(p => (
              <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-6 py-4"><p className="font-medium text-text-1">{p.name}</p><p className="text-xs text-text-3">{p.sku}</p></td>
                <td className="px-6 py-4 text-text-2">{p.currentStock} un</td>
                <td className="px-6 py-4 text-text-2">{p.reorderPoint} un</td>
                <td className="px-6 py-4"><Semaforo status={p.status} /></td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button onClick={() => handleSimularVenda(p)} title="Simular Venda" className="p-2 text-text-2 hover:text-green rounded-lg hover:bg-green-bg transition-colors"><ShoppingCart size={16} /></button>
                  <button onClick={() => openModal(p)} className="p-2 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-2 text-text-2 hover:text-danger rounded-lg hover:bg-red-bg transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Nome do Produto', key: 'name', type: 'text', colSpan: 2 },
              { label: 'SKU', key: 'sku', type: 'text' },
              { label: 'Estoque Atual', key: 'currentStock', type: 'number' },
              { label: 'Consumo Diário', key: 'avgDailyConsumption', type: 'number' },
              { label: 'Lead Time (Dias)', key: 'leadTimeDays', type: 'number' },
              { label: 'Estoque de Segurança (Dias)', key: 'safetyStockDays', type: 'number', colSpan: 2 },
            ].map(({ label, key, type, colSpan }) => (
              <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-text-1 mb-1">{label}</label>
                <input type={type} required value={(form as any)[key] ?? ''} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none" />
              </div>
            ))}
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
