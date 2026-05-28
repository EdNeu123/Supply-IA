import { Modal } from '@/components/ui/Modal';
import { Semaforo } from '@/components/ui/Semaforo';
import { Product } from '@/models/types';
import { rfqService } from '@/services/apiServices';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Send, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

  // Pega TODOS os fornecedores vinculados (independente do status)
  const getAllLinkedSuppliers = (productId: string) =>
    suppliers.filter(s => (s.productIds ?? []).includes(productId));

  // Pega apenas os fornecedores que estão com o Telegram ativo
  const getActiveSuppliers = (productId: string) =>
    getAllLinkedSuppliers(productId).filter(s => s.status === 'active');

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
        
        const linked = getAllLinkedSuppliers(p.id);
        const ativos = getActiveSuppliers(p.id);
        
        if (ativos.length > 0) {
          rfqMutation.mutate({ productId: p.id, supplierIds: ativos.map(s => s.id) });
        } else if (linked.length > 0) {
          toast.error('O fornecedor está vinculado, mas o Telegram não está ativo. Peça para ele iniciar o bot.');
        } else {
          toast.error('Nenhum fornecedor vinculado a este produto. Vincule em "Fornecedores".');
        }
      } else {
        toast.success('Venda simulada! (-1 unidade)');
      }
    } catch {
      toast.error('Erro ao simular venda. Backend está rodando?');
    }
  };

  const handleDispararCotacao = (p: Product) => {
    const linked = getAllLinkedSuppliers(p.id);
    const ativos = getActiveSuppliers(p.id);

    if (ativos.length === 0) {
      if (linked.length > 0) {
        toast.error('Há fornecedores vinculados, mas nenhum ativou o bot do Telegram ainda.');
      } else {
        toast.error('Nenhum fornecedor vinculado a este produto. Vá em "Fornecedores" e vincule produtos.');
      }
      return;
    }
    
    setSelectedProduct(p);
    setRfqModalOpen(true);
  };

  const confirmarCotacao = () => {
    if (!selectedProduct) return;
    const ativos = getActiveSuppliers(selectedProduct.id);
    rfqMutation.mutate({ productId: selectedProduct.id, supplierIds: ativos.map(s => s.id) });
  };

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
              const linkedSuppliers = getAllLinkedSuppliers(p.id);
              const activeSuppliers = getActiveSuppliers(p.id);
              
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <Truck size={13} className={activeSuppliers.length > 0 ? "text-green" : "text-yellow"} />
                          <span className={`text-xs font-medium ${activeSuppliers.length > 0 ? "text-green" : "text-text-1"}`}>
                            {linkedSuppliers.length} vinculado(s)
                          </span>
                        </div>
                        {activeSuppliers.length === 0 && (
                          <span className="text-[10px] text-yellow">⚠️ Nenhum com Telegram ativo</span>
                        )}
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

      <Modal isOpen={rfqModalOpen} onClose={() => setRfqModalOpen(false)} title="Disparar Cotação Manual">
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            Disparar cotação para <strong className="text-text-1">"{selectedProduct?.name}"</strong> via Telegram para os fornecedores vinculados e ativos:
          </p>
          {selectedProduct && (
            <div className="bg-surface-2 rounded-xl p-3 space-y-1">
              {getActiveSuppliers(selectedProduct.id).map(s => (
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