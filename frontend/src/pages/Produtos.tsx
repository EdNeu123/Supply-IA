import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { rfqService } from '@/services/apiServices';
import { Semaforo } from '@/components/ui/Semaforo';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, ShoppingCart, Send, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/models/types';

const emptyForm = (): Partial<Product> => ({
  name: '', sku: '', currentStock: 0,
  avgDailyConsumption: 0, leadTimeDays: 0, safetyStockDays: 0,
});

const fieldConfig = [
  { label: 'Nome do Produto',              key: 'name',                type: 'text',   colSpan: 2, help: 'Ex: Café em Grão 1kg' },
  { label: 'Código (SKU)',                 key: 'sku',                 type: 'text',   colSpan: 1, help: 'Ex: CF-001' },
  { label: 'Estoque Atual (unidades)',     key: 'currentStock',        type: 'number', colSpan: 1, help: 'Quantas unidades você tem hoje' },
  { label: 'Quanto vende por dia (un.)',  key: 'avgDailyConsumption', type: 'number', colSpan: 1, help: 'Média diária de saída' },
  { label: 'Prazo do fornecedor (dias)',  key: 'leadTimeDays',        type: 'number', colSpan: 1, help: 'Dias até a entrega após o pedido' },
  { label: 'Dias de segurança',           key: 'safetyStockDays',    type: 'number', colSpan: 2, help: 'Margem extra de estoque (ex: 3 dias)' },
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

  // Fornecedores ativos vinculados a um produto específico
  const getSuppliersForProduct = (productId: string) =>
    suppliers.filter(s => s.status === 'active' && (s.productIds ?? []).includes(productId));

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      editId ? productService.update(editId, data) : productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produto ${editId ? 'atualizado' : 'criado'}!`);
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Erro ao salvar produto. Verifique se o backend está rodando.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto excluído!'); },
    onError: () => toast.error('Erro ao excluir produto.'),
  });

  const rfqMutation = useMutation({
    mutationFn: rfqService.trigger,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      toast.success('Cotação disparada! Os fornecedores receberão a mensagem via Telegram.');
      setRfqModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Erro ao disparar cotação.');
    },
  });

  const openModal = (p?: Product) => {
    setEditId(p?.id ?? null);
    setForm(p ? { ...p } : emptyForm());
    setIsOpen(true);
  };

  const handleSimularVenda = async (p: Product) => {
    const novoEstoque = p.currentStock - 1;
    if (novoEstoque < 0) return toast.error('Estoque já está zerado!');

    try {
      await productService.update(p.id, { ...p, currentStock: novoEstoque });
      qc.invalidateQueries({ queryKey: ['products'] });

      if (novoEstoque <= p.reorderPoint && p.currentStock > p.reorderPoint) {
        toast.warning(`⚠️ Ponto de pedido atingido para "${p.name}"!`);
        const ativos = getSuppliersForProduct(p.id);
        if (ativos.length > 0) {
          rfqMutation.mutate({ productId: p.id, supplierIds: ativos.map(s => s.id) });
        } else {
          toast.error('Nenhum fornecedor ativo vinculado a este produto. Vincule fornecedores em "Fornecedores".');
        }
      } else {
        toast.success('Venda simulada! (-1 unidade)');
      }
    } catch {
      toast.error('Erro ao simular venda. Backend está rodando?');
    }
  };

  const handleDispararCotacao = (p: Product) => {
    const ativos = getSuppliersForProduct(p.id);
    if (!ativos.length) {
      toast.error('Nenhum fornecedor ativo vinculado a este produto. Vá em "Fornecedores" e vincule produtos.');
      return;
    }
    setSelectedProduct(p);
    setRfqModalOpen(true);
  };

  const confirmarCotacao = () => {
    if (!selectedProduct) return;
    const ativos = getSuppliersForProduct(selectedProduct.id);
    rfqMutation.mutate({ productId: selectedProduct.id, supplierIds: ativos.map(s => s.id) });
  };

  // Preview do ponto de pedido no formulário
  const previewPP =
    (form.avgDailyConsumption ?? 0) > 0
      ? (Number(form.avgDailyConsumption) * Number(form.leadTimeDays ?? 0)) +
        (Number(form.avgDailyConsumption) * Number(form.safetyStockDays ?? 0))
      : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-1">Gestão de Produtos</h2>
        <button onClick={() => openModal()}
          className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-colors text-sm font-medium">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-medium">Nome (SKU)</th>
              <th className="px-6 py-3 font-medium">Estoque</th>
              <th className="px-6 py-3 font-medium">Ponto de Pedido</th>
              <th className="px-6 py-3 font-medium">Fornecedores</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-2">Carregando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-2">Nenhum produto cadastrado.</td></tr>
            ) : products.map(p => {
              const linkedSuppliers = getSuppliersForProduct(p.id);
              return (
                <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-text-1">{p.name}</p>
                    <p className="text-xs text-text-3">{p.sku}</p>
                  </td>
                  <td className="px-6 py-3 text-text-2">{p.currentStock} un</td>
                  <td className="px-6 py-3 text-text-2">{p.reorderPoint} un</td>
                  <td className="px-6 py-3">
                    {linkedSuppliers.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Truck size={13} className="text-green" />
                        <span className="text-xs text-green font-medium">{linkedSuppliers.length} ativo(s)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-yellow">⚠️ Sem vínculo</span>
                    )}
                  </td>
                  <td className="px-6 py-3"><Semaforo status={p.status} /></td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDispararCotacao(p)} title="Disparar Cotação Manual"
                        className="p-1.5 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors">
                        <Send size={15} />
                      </button>
                      <button onClick={() => handleSimularVenda(p)} title="Simular Venda (-1 un.)"
                        className="p-1.5 text-text-2 hover:text-green rounded-lg hover:bg-green-bg transition-colors">
                        <ShoppingCart size={15} />
                      </button>
                      <button onClick={() => openModal(p)}
                        className="p-1.5 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)}
                        className="p-1.5 text-text-2 hover:text-danger rounded-lg hover:bg-red-bg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Produto */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fieldConfig.map(({ label, key, type, colSpan, help }) => (
              <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-text-1 mb-1">{label}</label>
                <input type={type} required
                  placeholder={help}
                  value={(form as any)[key] ?? ''}
                  onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm placeholder:text-text-3 placeholder:text-xs" />
                <p className="text-xs text-text-3 mt-0.5">{help}</p>
              </div>
            ))}
          </div>

          {previewPP !== null && (
            <div className="p-3 bg-accent-bg rounded-xl text-sm text-accent flex items-center gap-2">
              📦 Ponto de pedido calculado: <strong>{previewPP} unidades</strong>
              <span className="text-xs text-text-2 ml-1">— sistema alertará neste nível.</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 min-w-[80px]">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Cotação Manual */}
      <Modal isOpen={rfqModalOpen} onClose={() => setRfqModalOpen(false)} title="Disparar Cotação Manual">
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            Disparar cotação para <strong className="text-text-1">"{selectedProduct?.name}"</strong> via Telegram para os fornecedores vinculados e ativos:
          </p>
          {selectedProduct && (
            <div className="bg-surface-2 rounded-xl p-3 space-y-1">
              {getSuppliersForProduct(selectedProduct.id).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <Truck size={14} className="text-accent" />
                  <span className="text-text-1 font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button onClick={() => setRfqModalOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
            <button onClick={confirmarCotacao} disabled={rfqMutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2">
              <Send size={14} />
              {rfqMutation.isPending ? 'Disparando...' : 'Confirmar e Disparar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
