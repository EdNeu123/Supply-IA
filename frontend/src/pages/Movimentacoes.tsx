import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimentacaoService } from '@/services/apiServices';
import { productService } from '@/services/productService';
import { Modal } from '@/components/ui/Modal';
import { ArrowDownCircle, ArrowUpCircle, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/models/types';

const MOTIVOS_SAIDA  = ['Venda', 'Perda / Avaria', 'Consumo interno', 'Devolução ao fornecedor', 'Outro'];
const MOTIVOS_ENTRADA = ['Compra recebida', 'Devolução de cliente', 'Ajuste de inventário', 'Transferência', 'Outro'];

export const Movimentacoes = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen]   = useState(false);
  const [form, setForm]       = useState({ productId: '', tipo: 'saida', quantidade: '', motivo: '' });
  const [ppAviso, setPpAviso] = useState<{ produto: string; antes: number; depois: number } | null>(null);

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: movs = [], isLoading } = useQuery({ queryKey: ['movimentacoes'], queryFn: movimentacaoService.list });

  // Produto selecionado — para preview do ponto de pedido
  const produtoSel = products.find(p => p.id === form.productId) as Product | undefined;

  const novoEstoque = produtoSel && form.quantidade
    ? form.tipo === 'entrada'
      ? produtoSel.currentStock + Number(form.quantidade)
      : produtoSel.currentStock - Number(form.quantidade)
    : null;

  const createMutation = useMutation({
    mutationFn: movimentacaoService.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setIsOpen(false);
      setForm({ productId: '', tipo: 'saida', quantidade: '', motivo: '' });

      if (data.ppMudou) {
        setPpAviso({
          produto: produtoSel?.name ?? '',
          antes: produtoSel?.reorderPoint ?? 0,
          depois: data.produto.reorderPoint,
        });
      }
      toast.success('Movimentação registrada!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Erro ao registrar movimentação.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) return toast.error('Selecione um produto.');
    if (!form.quantidade || Number(form.quantidade) <= 0) return toast.error('Informe uma quantidade válida.');
    createMutation.mutate({
      productId: form.productId,
      tipo: form.tipo,
      quantidade: Number(form.quantidade),
      motivo: form.motivo,
    });
  };

  const openModal = (tipo: 'entrada' | 'saida') => {
    setForm({ productId: '', tipo, quantidade: '', motivo: '' });
    setIsOpen(true);
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-1">Movimentações de Estoque</h2>
          <p className="text-sm text-text-2 mt-0.5">Registre entradas e saídas. O sistema recalcula o consumo médio e o ponto de pedido automaticamente.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal('entrada')}
            className="flex items-center gap-2 px-4 py-2 bg-green-bg text-green rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity border border-green/20">
            <ArrowDownCircle size={16} /> Entrada
          </button>
          <button onClick={() => openModal('saida')}
            className="flex items-center gap-2 px-4 py-2 bg-red-bg text-danger rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity border border-danger/20">
            <ArrowUpCircle size={16} /> Saída
          </button>
        </div>
      </div>

      {/* Aviso de ponto de pedido atualizado */}
      {ppAviso && (
        <div className="flex items-start gap-3 p-4 bg-accent-bg border border-accent/20 rounded-2xl">
          <RefreshCw size={18} className="text-accent mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-accent">Ponto de pedido recalculado!</p>
            <p className="text-sm text-text-2 mt-0.5">
              O consumo médio de <strong>{ppAviso.produto}</strong> foi atualizado com base no histórico.
              Ponto de pedido: <span className="line-through text-text-3">{ppAviso.antes} un</span>{' '}
              → <strong className="text-accent">{ppAviso.depois} un</strong>
            </p>
          </div>
          <button onClick={() => setPpAviso(null)} className="text-text-3 hover:text-text-1 text-lg leading-none">×</button>
        </div>
      )}

      {/* Tabela de histórico */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-text-1">Histórico</h3>
          <span className="text-xs text-text-3">Últimas 100 movimentações</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-medium">Data</th>
              <th className="px-6 py-3 font-medium">Produto</th>
              <th className="px-6 py-3 font-medium">Tipo</th>
              <th className="px-6 py-3 font-medium">Qtd</th>
              <th className="px-6 py-3 font-medium">Estoque</th>
              <th className="px-6 py-3 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-2">Carregando...</td></tr>
            ) : movs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-text-3">
                    <Plus size={32} className="opacity-30" />
                    <p className="text-sm">Nenhuma movimentação registrada.</p>
                    <p className="text-xs">Use os botões "Entrada" ou "Saída" para começar.</p>
                  </div>
                </td>
              </tr>
            ) : movs.map(m => (
              <tr key={m.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-6 py-3 text-text-2 text-xs whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-6 py-3 font-medium text-text-1">{getProductName(m.productId)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    m.tipo === 'entrada' ? 'bg-green-bg text-green' : 'bg-red-bg text-danger'
                  }`}>
                    {m.tipo === 'entrada' ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                    {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`font-semibold ${m.tipo === 'entrada' ? 'text-green' : 'text-danger'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}
                  </span>
                </td>
                <td className="px-6 py-3 text-text-2 text-xs">
                  {m.estoqueAntes} → <strong className="text-text-1">{m.estoqueDepois}</strong> un
                </td>
                <td className="px-6 py-3 text-text-2">{m.motivo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={form.tipo === 'entrada' ? '📦 Registrar Entrada' : '📤 Registrar Saída'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-text-1 mb-1">Produto <span className="text-danger">*</span></label>
            <select required value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm">
              <option value="">Selecione um produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Estoque: {p.currentStock} un</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-text-1 mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['saida', 'entrada'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    form.tipo === t
                      ? t === 'entrada' ? 'border-green bg-green-bg text-green' : 'border-danger bg-red-bg text-danger'
                      : 'border-border text-text-2 hover:bg-surface-2'
                  }`}>
                  {t === 'entrada' ? <><ArrowDownCircle size={15} /> Entrada</> : <><ArrowUpCircle size={15} /> Saída</>}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-text-1 mb-1">Quantidade <span className="text-danger">*</span></label>
            <input type="number" min="1" required placeholder="Ex: 50"
              value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-text-1 mb-1">Motivo</label>
            <select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm">
              <option value="">Selecione (opcional)...</option>
              {(form.tipo === 'saida' ? MOTIVOS_SAIDA : MOTIVOS_ENTRADA).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Preview do impacto */}
          {produtoSel && form.quantidade && Number(form.quantidade) > 0 && (
            <div className={`p-3 rounded-xl text-sm border ${
              novoEstoque !== null && novoEstoque < 0
                ? 'bg-red-bg border-danger/20 text-danger'
                : 'bg-surface-2 border-border text-text-2'
            }`}>
              {novoEstoque !== null && novoEstoque < 0 ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle size={14} /> Estoque insuficiente! Atual: {produtoSel.currentStock} un
                </span>
              ) : (
                <div className="space-y-1">
                  <p>
                    Estoque: <strong className="text-text-1">{produtoSel.currentStock}</strong>
                    {' '}→{' '}
                    <strong className={form.tipo === 'entrada' ? 'text-green' : novoEstoque! <= produtoSel.reorderPoint ? 'text-danger' : 'text-text-1'}>
                      {novoEstoque} un
                    </strong>
                  </p>
                  {form.tipo === 'saida' && novoEstoque !== null && novoEstoque <= produtoSel.reorderPoint && (
                    <p className="text-yellow flex items-center gap-1">
                      <AlertTriangle size={13} /> Atingirá o ponto de pedido ({produtoSel.reorderPoint} un) — cotação automática será disparada.
                    </p>
                  )}
                  {form.tipo === 'saida' && (
                    <p className="text-xs text-text-3">O consumo médio será recalculado com base no histórico de saídas.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending || (novoEstoque !== null && novoEstoque < 0)}
              className={`px-5 py-2 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                form.tipo === 'entrada' ? 'bg-green hover:opacity-90' : 'bg-danger hover:opacity-90'
              }`}>
              {createMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
