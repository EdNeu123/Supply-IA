import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rfqService, quoteService, purchaseOrderService } from '@/services/apiServices';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Check, MessageSquare, RefreshCw } from 'lucide-react';

export const Cotacoes = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);
  const [sim, setSim] = useState({ supplierId: '', rawReply: '' });

  // FIX 1: refetchInterval de 8s — atualiza automaticamente quando chega resposta do Telegram
  const { data: rfqs = [], isFetching: fetchingRfqs } = useQuery({
    queryKey: ['rfqs'],
    queryFn: rfqService.list,
    refetchInterval: 8000,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: quoteService.list,
    refetchInterval: 8000,
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const simulateMutation = useMutation({
    mutationFn: quoteService.simulate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('IA estruturou a resposta!');
      setModalOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: purchaseOrderService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Ordem de compra gerada!');
    },
  });

  const ranked = (rfqId: string) =>
    quotes
      .filter(q => q.rfqId === rfqId && q.status === 'answered')
      .sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity));

  // FIX 2: formata validade em data legível
  const formatValidade = (leadTimeDays?: number, validityDays?: number, createdAt?: string) => {
    if (!validityDays || !createdAt) return '-';
    const base = new Date(createdAt);
    base.setDate(base.getDate() + validityDays);
    return `Até ${base.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-1">Comparativo de Cotações</h2>
        {/* FIX 3: botão de refresh manual */}
        <button
          onClick={() => { qc.invalidateQueries({ queryKey: ['rfqs'] }); qc.invalidateQueries({ queryKey: ['quotes'] }); }}
          className="flex items-center gap-2 text-sm text-text-2 hover:text-text-1 transition-colors"
        >
          <RefreshCw size={14} className={fetchingRfqs ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {rfqs.length === 0
        ? <p className="text-text-2">Nenhuma cotação em andamento.</p>
        : rfqs.map(rfq => {
          const product = products.find(p => p.id === rfq.productId);
          const rfqQuotes = ranked(rfq.id);
          return (
            <div key={rfq.id} className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-text-1">{product?.name || 'Produto'}</h3>
                  <p className="text-sm text-text-2">{new Date(rfq.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <button
                  onClick={() => { setSelectedRfq(rfq.id); setModalOpen(true); }}
                  className="bg-surface-2 text-text-1 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-border transition-colors text-sm font-medium"
                >
                  <MessageSquare size={16} /> Simular Resposta
                </button>
              </div>

              {rfqQuotes.length === 0
                ? (
                  <div className="p-4 bg-surface-2 rounded-xl text-text-2 text-sm flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin opacity-40" />
                    Aguardando respostas... (atualizando automaticamente)
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-left text-sm">
                      {/* FIX 4: tabela com todos os campos incluindo Qtd. Mín. e Validade */}
                      <thead className="bg-surface-2 text-text-2 border-b border-border">
                        <tr>
                          {['Rank', 'Fornecedor', 'Preço Unit.', 'Qtd. Mín.', 'Prazo', 'Validade', 'Ação'].map(h => (
                            <th key={h} className={`px-4 py-3 whitespace-nowrap ${h === 'Ação' ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rfqQuotes.map((q, i) => {
                          const sup = suppliers.find(s => s.id === q.supplierId);
                          const qty = q.minQty ?? 1;
                          const total = (q.unitPrice ?? 0) * qty;
                          return (
                            <tr key={q.id} className={i === 0 ? 'bg-green-bg bg-opacity-20' : ''}>
                              <td className="px-4 py-3 font-medium">#{i + 1}</td>
                              <td className="px-4 py-3">{sup?.name ?? '-'}</td>
                              <td className="px-4 py-3 font-medium">
                                {q.unitPrice != null ? `R$ ${q.unitPrice.toFixed(2)}` : '-'}
                              </td>
                              {/* FIX: Qtd. Mín. agora renderiza */}
                              <td className="px-4 py-3">
                                {q.minQty != null ? `${q.minQty} un` : '1 un'}
                              </td>
                              <td className="px-4 py-3">
                                {q.leadTimeDays != null ? `${q.leadTimeDays} dias` : '-'}
                              </td>
                              {/* FIX: Validade agora renderiza */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatValidade(q.leadTimeDays, q.validityDays, q.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => approveMutation.mutate({
                                    quoteId: q.id,
                                    productId: q.productId,
                                    supplierId: q.supplierId,
                                    qty,
                                    total,
                                  })}
                                  disabled={approveMutation.isPending}
                                  className="bg-accent text-white px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto hover:bg-opacity-90 transition-colors disabled:opacity-50"
                                >
                                  <Check size={14} /> Aprovar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          );
        })}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Simular Resposta (Plano B)">
        <form
          onSubmit={e => { e.preventDefault(); simulateMutation.mutate({ rfqId: selectedRfq!, ...sim }); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <select
              required value={sim.supplierId}
              onChange={e => setSim({ ...sim, supplierId: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-surface outline-none"
            >
              <option value="">Selecione...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto Livre</label>
            <textarea
              required rows={4}
              placeholder="Ex: Consigo fazer a R$ 12,50, entrego em 3 dias, mínimo 10 unidades, válido por 7 dias."
              value={sim.rawReply}
              onChange={e => setSim({ ...sim, rawReply: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-surface outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={simulateMutation.isPending}
            className="w-full bg-accent text-white py-2 rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {simulateMutation.isPending ? 'Processando...' : 'Estruturar com IA'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
